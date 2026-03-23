import { statusToStep } from "~/utils/aliases/utils";
import type { DepositEvent, StepperStep } from "~/utils/types";

export function FlowStepper({ events, t }: { events: DepositEvent[]; t: (key: string) => string }) {
  const steps: { key: StepperStep; label: string }[] = [
    { key: "deposit", label: t("send.stepDeposit") },
    { key: "bridge", label: t("send.stepBridge") },
    { key: "finalize", label: t("send.stepFinalize") },
    { key: "complete", label: t("send.stepComplete") },
  ];

  const activeIndex = Math.max(
    0,
    ...events.map((event) => steps.findIndex((step) => step.key === statusToStep(event.status, event.stuck > 0))),
  );

  return (
    <div className="send-alias-progress">
      <h3 className="tab-subtitle">{t("send.transferProgress")}</h3>
      <div className="send-alias-steps">
        {steps.map((step, index) => {
          const complete = index < activeIndex || (index === activeIndex && activeIndex === steps.length - 1);
          const current = index === activeIndex;
          return (
            <div
              key={step.key}
              className={`send-alias-step ${complete ? "complete" : current ? "current" : ""}`}
            >
              <div className="send-alias-step-title">{step.label}</div>
              <div className="send-alias-step-state">
                {complete ? t("send.done") : current ? t("send.inProgress") : t("send.pending")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
