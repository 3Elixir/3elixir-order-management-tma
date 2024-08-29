import { type PropsWithChildren } from "react";
import CreationFormProgress from "../orders/CreationFormProgress";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";

interface OrderFormLayoutProps extends PropsWithChildren {
  title: string;
  description: string;
  currentStep: number;
  totalSteps?: number;
}

const OrderFormLayout = ({
  children,
  title,
  description,
  currentStep,
  totalSteps = 4,
}: OrderFormLayoutProps) => {
  return (
    <div className="flex h-full flex-col pt-4">
      <CreationFormProgress currentStep={currentStep} totalSteps={totalSteps} />

      <Card className="mx-4 mt-4">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
      <div className="flex flex-grow flex-col">{children}</div>
    </div>
  );
};

export default OrderFormLayout;
