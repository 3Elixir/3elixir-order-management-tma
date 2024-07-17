import { useThemeParams } from "@tma.js/sdk-react";
import { cn } from "~/lib/utils";

interface PageHeaderProps {
  title: string;
  className?: string;
}
const PageHeader = ({ title, className }: PageHeaderProps) => {
  const tmaThemeParams = useThemeParams();
  return (
    <div
      className={cn(
        "sticky top-0 z-40 flex items-center justify-center px-4 py-2 pb-3",
        className,
      )}
      style={{
        backgroundColor: tmaThemeParams.sectionBackgroundColor,
      }}
    >
      <h1
        className="font-bold"
        style={{
          color: tmaThemeParams.textColor,
        }}
      >
        {title}
      </h1>
    </div>
  );
};

export default PageHeader;
