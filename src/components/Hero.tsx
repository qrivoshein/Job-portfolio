import { IdCard } from './IdCard';

export function Hero() {
  return (
    <section className="section section-hero" data-section="hero" data-screen-label="01 Hero">
      <div className="corner corner-tl t-mono-xs">ПОРТФОЛИО / 2026</div>
      <div className="corner corner-tr t-mono-xs">EK · 25.11.2003</div>
      <div className="corner corner-bl t-mono-xs">МОСКВА · ОТКРЫТ К ПРЕДЛОЖЕНИЯМ</div>
      <div className="corner corner-br t-mono-xs">[ НАЖМИТЕ ЧТОБЫ ПЕРЕВЕРНУТЬ ]</div>

      <div className="hero-card-stage">
        <IdCard />
      </div>
    </section>
  );
}

export function Contact() {
  return (
    <section className="section section-contact" data-section="contact" data-screen-label="05 Контакт">
      <div className="corner corner-tl t-mono-xs">КОНТАКТ / 2026</div>
      <div className="corner corner-tr t-mono-xs">EK · REV</div>
      <div className="corner corner-bl t-mono-xs">[ НАЖМИТЕ ЧТОБЫ ПЕРЕВЕРНУТЬ ]</div>
      <div className="corner corner-br t-mono-xs">МОСКВА · 2026</div>

      <div className="hero-card-stage">
        <IdCard initialFlipped />
      </div>

      <div className="contact-footer t-mono-xs">МОСКВА · 2026</div>
    </section>
  );
}
