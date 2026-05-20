import { AppIcon } from './sectionPrimitives';

export function Experience() {
  return (
    <section className="section section-content" data-section="experience" data-screen-label="02 Опыт">
      <div className="section-grid">
        <header className="section-head">
          <div className="t-mono section-eyebrow">02 / ОПЫТ</div>
          <h2 className="t-display">ОПЫТ</h2>
          <p className="t-meta section-subtitle">
            Система Глобус · QA Engineer
            <br />
            Июнь 2022 — настоящее время · 3+ года
          </p>
          <p className="t-body section-body">
            Тестирование трёх продуктов: клиентского приложения с системой лояльности,
            рабочего приложения для сотрудников и сервиса экспресс-доставки. Web, mobile, backend.
            Построил процесс тестирования с нуля, внедрил API-тестирование в команде,
            участвовал в миграции с монолита на микросервисы.
            Field-тестирование на складах: кассы самообслуживания, весы, планшеты,
            электронные ценники.
          </p>
          <div className="t-mono section-stack">
            Postman · TestRail · Charles · GitLab CI/CD · Kibana · Grafana ·
            PostgreSQL · Redis · Kafka · Selenium · Docker · Jira · Confluence
          </div>
        </header>

        <div className="section-visual">
          <div className="apps-row">
            <AppIcon name="Глобус" hue={208} src="/icons/globus-loya.webp" />
            <AppIcon name="Глобус Про" hue={272} src="/icons/globus-pro.webp" />
            <AppIcon name="Глобус Экспресс" hue={186} src="/icons/globus-express.webp" />
          </div>
        </div>
      </div>
    </section>
  );
}
