import { ScreenshotPanel } from './sectionPrimitives';

export function Messenger() {
  return (
    <section className="section section-content" data-section="messenger" data-screen-label="03 Secure Messenger">
      <div className="section-grid">
        <header className="section-head">
          <div className="t-mono section-eyebrow">03 / ПРОЕКТ</div>
          <h2 className="t-display t-display-fit">
            SECURE<br />MESSENGER
          </h2>
          <p className="t-meta section-subtitle">
            Защищённый веб-мессенджер с end-to-end архитектурой
          </p>
          <p className="t-body section-body">
            Дипломный проект, дошедший до всероссийского акселератора. Спроектировал
            и реализовал в одиночку: backend на Node.js + Express + WebSocket,
            базы PostgreSQL и Redis, frontend на чистом TypeScript без фреймворков,
            parser-service на Python. Реалтайм-обмен сообщениями, presence,
            аутентификация, обмен файлами. Доведён до production: nginx,
            миграции БД, deploy-конфиги.
          </p>
          <div className="achievement">
            <span className="t-mono achievement-text">
              2 МЕСТО ИЗ 60 КОМАНД · АКСЕЛЕРАТОР ВЯТГУ → ВСЕРОССИЙСКИЙ АКСЕЛЕРАТОР
            </span>
          </div>
          <div className="section-ctas">
            <a
              className="btn-link"
              href="https://qrivoshein.github.io/secure-messenger/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>ДЕМО</span>
              <span className="btn-arrow">→</span>
            </a>
          </div>
        </header>

        <div className="section-visual">
          <ScreenshotPanel index={0} label="ЧАТ" src="/messenger/secure-messenger1.png" />
          <ScreenshotPanel index={1} label="СПИСОК" src="/messenger/secure-messenger2.png" />
          <ScreenshotPanel index={2} label="ФАЙЛЫ" src="/messenger/secure-messenger3.png" />
        </div>
      </div>
    </section>
  );
}
