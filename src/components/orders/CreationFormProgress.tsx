import { useMemo } from "react";

interface CreationFormProgressProps {
  currentStep: number;
  totalSteps: number;
}

const CreationFormProgress = ({
  currentStep,
  totalSteps,
}: CreationFormProgressProps) => {
  const steps: Array<{
    name: string;
    status: "complete" | "current" | "upcoming";
  }> = useMemo(
    () =>
      Array.from({ length: totalSteps }, (_, i) => {
        return {
          name: `Step ${i + 1}`,
          status:
            i + 1 < currentStep
              ? "complete"
              : i + 1 === currentStep
                ? "current"
                : "upcoming",
        };
      }),
    [currentStep, totalSteps],
  );

  return (
    <nav className="flex items-center justify-center" aria-label="Progress">
      <p className="text-sm font-medium">
        Step {steps.findIndex((step) => step.status === "current") + 1} of{" "}
        {steps.length}
      </p>
      <ol role="list" className="ml-8 flex items-center space-x-5">
        {steps.map((step) => (
          <li key={step.name}>
            {step.status === "complete" ? (
              <div className="block h-2.5 w-2.5 rounded-full bg-primary">
                <span className="sr-only">{step.name}</span>
              </div>
            ) : step.status === "current" ? (
              <div
                className="relative flex items-center justify-center"
                aria-current="step"
              >
                <span className="absolute flex h-5 w-5 p-px" aria-hidden="true">
                  <span className="h-full w-full rounded-full bg-gray-200" />
                </span>
                <span
                  className="relative block h-2.5 w-2.5 rounded-full bg-primary"
                  aria-hidden="true"
                />
                <span className="sr-only">{step.name}</span>
              </div>
            ) : (
              <div className="block h-2.5 w-2.5 rounded-full bg-gray-200 hover:bg-gray-400">
                <span className="sr-only">{step.name}</span>
              </div>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default CreationFormProgress;
