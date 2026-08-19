import {
  ArrowRight,
  BrainCircuit,
  Code2,
  FileText,
  GitPullRequest,
  HandHeart,
  MessageSquareText,
  Network,
  Radar,
  SearchCheck,
  Users,
} from "lucide-react";
import { useLanguage } from "@/app/contexts/language-context";

export function ValueFlowSection() {
  const { t } = useLanguage();
  const stages = [
    {
      title: t("valueFlow.connection.title"),
      description: t("valueFlow.connection.description"),
      tone: "teal",
      items: [
        { icon: Code2, label: t("valueFlow.connection.commit") },
        { icon: GitPullRequest, label: t("valueFlow.connection.review") },
        { icon: MessageSquareText, label: t("valueFlow.connection.issue") },
        { icon: FileText, label: t("valueFlow.connection.docs") },
      ],
    },
    {
      title: t("valueFlow.assessment.title"),
      description: t("valueFlow.assessment.description"),
      tone: "blue",
      items: [
        { icon: BrainCircuit, label: t("valueFlow.assessment.intelligence") },
        { icon: Network, label: t("valueFlow.assessment.collaboration") },
        { icon: Radar, label: t("valueFlow.assessment.ecosystem") },
      ],
    },
    {
      title: t("valueFlow.return.title"),
      description: t("valueFlow.return.description"),
      tone: "amber",
      items: [
        { icon: SearchCheck, label: t("valueFlow.return.demand") },
        { icon: Users, label: t("valueFlow.return.reach") },
        { icon: HandHeart, label: t("valueFlow.return.feedback") },
      ],
    },
  ];

  return (
    <section className="homepage-value-section" aria-labelledby="value-flow-title">
      <div className="homepage-value-panel">
        <header className="homepage-value-panel__header">
          <div>
            <span>{t("hero.protocol.title")}</span>
            <h2 id="value-flow-title">{t("valueFlow.title")}</h2>
          </div>
          <p>
            {t("valueFlow.description")}
          </p>
        </header>

        <div className="homepage-value-flow">
          <div className="homepage-value-flow__rail" aria-hidden="true" />
          {stages.map((stage, index) => (
            <article key={stage.title} className={`homepage-value-stage homepage-value-stage--${stage.tone}`}>
              <div className="homepage-value-stage__header">
                <span className="homepage-value-stage__index">0{index + 1}</span>
                <div>
                  <h3>{stage.title}</h3>
                  <p>{stage.description}</p>
                </div>
              </div>
              <ul>
                {stage.items.map(({ icon: Icon, label }) => (
                  <li key={label}>
                    <Icon className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
              {index < stages.length - 1 ? (
                <ArrowRight className="homepage-value-stage__arrow" strokeWidth={1.5} aria-hidden="true" />
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
