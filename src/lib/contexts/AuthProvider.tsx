import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { z } from "zod";
import { useInitData, useMainButton } from "@tma.js/sdk-react";
import { retrieveLaunchParams } from "@tma.js/sdk";
import toast from "react-hot-toast";
import { Button } from "~/components/ui/button";
import { api } from "~/utils/api";

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
  login: () => Promise<string>;
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
  const loginMutation = api.auth.login.useMutation();

  const [user, setUser] = useState<AuthContextType["user"]>(getUser);
  const [isLoading, setIsLoading] =
    useState<AuthContextType["isLoading"]>(false);
  const [status, setStatus] = useState<AuthContextType["status"]>("loading");

  // Authenticate user via tRPC
  const login: AuthContextType["login"] = useCallback(async () => {
    setIsLoading(true);
    setStatus("loading");

    try {
      // Get initDataRaw from TMA SDK
      const launchParams = retrieveLaunchParams();
      const initDataRaw = launchParams.initDataRaw;

      if (!initDataRaw) {
        throw new Error("Failed to retrieve Telegram init data");
      }

      // Call tRPC login procedure
      const response = await loginMutation.mutateAsync({ initDataRaw });

      if (!response.success || !response.data) {
        throw new Error(response.message || "Authentication failed");
      }

      setStatus("success");
      localStorage.setItem("user", JSON.stringify(response.data));
      setUser(response.data);
      setIsLoading(false);

      return response.message;
    } catch (error) {
      setStatus("error");
      localStorage.removeItem("user");
      setUser(null);
      setIsLoading(false);
      throw error;
    }
  }, [loginMutation]);

  // Authenticate user via strapi on first render
  useEffect(() => {
    toast.promise(
      login(),
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
  }, []);

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

  const tmaMainButton = useMainButton();

  const onAuthRetry = () => {
    toast.promise(
      login(),
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
  }, [tmaMainButton, user]);

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

export { AuthGuard, AuthProvider, useAuth };
