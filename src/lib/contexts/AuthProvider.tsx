import { env } from "~/env";
import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { z } from "zod";
import { useInitData, useMainButton } from "@tma.js/sdk-react";
import toast from "react-hot-toast";
import { Button } from "~/components/ui/button";

const userDataSchema = z.object({
  jwt: z.string(),
  user: z.object({
    id: z.number(),
    username: z.string(),
    email: z.string(),
    provider: z.string(),
    confirmed: z.boolean(),
    blocked: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
    telegram_id: z.string().nullable(),
  }),
});
type UserDataType = z.infer<typeof userDataSchema>;

type AuthContextType = {
  user: UserDataType | null;
  isLoading: boolean;
  status: "loading" | "error" | "success";
  login: (telegram_user_id: string) => Promise<string>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: false,
  status: "loading",
  login: async () => {
    throw new Error("login must be used within an AuthProvider");
  },
});

interface AuthProviderProps extends PropsWithChildren {}

const AuthProvider = ({ children }: AuthProviderProps) => {
  const tmaInitData = useInitData();

  const [user, setUser] = useState<AuthContextType["user"]>(getUser);
  const [isLoading, setIsLoading] =
    useState<AuthContextType["isLoading"]>(false);
  const [status, setStatus] = useState<AuthContextType["status"]>("loading");

  // Authenticate user via strapi
  const login: AuthContextType["login"] = async (telegram_user_id) => {
    setIsLoading(true);
    setStatus("loading");
    const { data, message } = await authenticateUser({
      telegram_user_id: telegram_user_id.toString(),
    });
    setIsLoading(false);

    if (!data) {
      setStatus("error");
      localStorage.removeItem("user");
      setUser(null);
      throw new Error(message);
    }

    setStatus("success");
    localStorage.setItem("user", JSON.stringify(data));
    setUser(data);

    return message;
  };

  // Authenticate user via strapi on first render
  useEffect(() => {
    const telegram_user_id = tmaInitData?.user?.id;
    if (!telegram_user_id) return;

    toast.promise(
      login(telegram_user_id.toString()),
      {
        loading: "Authenticating user",
        success: (message) => message,
        error: (error) => error.message,
      },
      {
        position: "top-right",
        success: {
          duration: 2000,
          icon: "🔥",
        },
      },
    );
  }, [tmaInitData]);

  return (
    <AuthContext.Provider value={{ user, login, isLoading, status }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};

const AuthGuard = ({ children }: PropsWithChildren<{}>) => {
  const { user, login, isLoading } = useAuth();

  const tmaInitData = useInitData();
  const tmaMainButton = useMainButton();

  const onAuthRetry = () => {
    const telegram_user_id = tmaInitData?.user?.id;
    if (!telegram_user_id) {
      return toast.error("Failed to retry authentication");
    }
    toast.promise(
      login(tmaInitData?.user?.id.toString()),
      {
        loading: "Retrying authentication",
        success: (message) => message,
        error: (error) => error.message,
      },
      {
        position: "top-right",
        success: {
          duration: 2000,
          icon: "🔥",
        },
      },
    );
  };

  // Hide main button if user is not authenticated
  useEffect(() => {
    if (!user) {
      tmaMainButton?.hide();
    } else {
      tmaMainButton?.show();
    }
  }, [user]);

  if (!user && isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center justify-center p-8">
          <span className="text-5xl">🚀</span>
          <p className="mt-2 text-center text-lg font-semibold">
            Authenticating user ...
          </p>
        </div>
      </div>
    );
  }

  if (!user && !isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center justify-center p-8">
          <span className="text-5xl">💩</span>
          <p className="mt-2 text-center text-lg font-semibold text-red-500">
            Authentication failed
          </p>
          <Button
            className="mt-4"
            onClick={() => onAuthRetry()}
            disabled={isLoading}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const getUser = () => {
  const user = localStorage.getItem("user");
  if (user) {
    return userDataSchema.parse(JSON.parse(user));
  }
  return null;
};

const authenticateUser = async ({
  telegram_user_id,
}: {
  telegram_user_id: string;
}) => {
  try {
    const response = await fetch(
      `${env.NEXT_PUBLIC_STRAPI_API_URL}/api/auth/local`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: telegram_user_id,
          password: telegram_user_id,
        }),
      },
    );
    const data = await response.json();
    if (response.ok) {
      return {
        status: response.status,
        data: userDataSchema.parse(data),
        message: "User authenticated",
      };
    }

    if (response.status === 429) {
      return {
        status: response.status,
        data: null,
        message: "Authentication rate limit exceeded",
      };
    }

    return {
      status: response.status,
      data: null,
      message: "Failed to authenticate user",
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      data: null,
      message: "Failed to authenticate user",
    };
  }
};

export { AuthGuard, AuthProvider, useAuth };
