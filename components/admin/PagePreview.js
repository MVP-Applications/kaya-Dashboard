'use client'
import { BLOCK_TYPES } from '@/lib/admin/page-builder'

/**
 * A close-enough rendering of a custom page in the site's style, so the
 * admin sees the page take shape while editing. The website renders the
 * real thing from the same data (docs/page-builder.md) — this is a guide to
 * layout and copy, not a pixel-exact copy of the site.
 *
 * Arabic falls back to English wherever a translation is still empty, the
 * same rule the website follows.
 */

function textOf(data, locale) {
  return key => (locale === 'AR' && data[`${key}Ar`]) || data[key] || ''
}

function Emph({ text }) {
  const parts = String(text || '').split('*')
  return <>{parts.map((p, i) => (i % 2 ? <em key={i}>{p}</em> : <span key={i}>{p}</span>))}</>
}

function Paragraphs({ text }) {
  return String(text || '').split(/\n\s*\n/).filter(p => p.trim()).map((p, i) => <p key={i}>{p}</p>)
}

function Button({ label, action }) {
  if (!label) return null
  return (
    <span className={`ad-pp-btn${action === 'whatsapp' ? ' ad-pp-btn--wa' : ''}`}>
      {action === 'whatsapp' && <span aria-hidden="true">✆ </span>}{label}
    </span>
  )
}

function Placeholder({ label }) {
  return <div className="ad-pp-ph">{label}</div>
}

function Block({ block, locale, services, doctors }) {
  const t = textOf(block.data, locale)
  const d = block.data
  switch (block.type) {
    case 'hero':
      return (
        <section className={`ad-pp-hero ad-pp-hero--${d.align || 'left'}${d.image ? ' ad-pp-hero--img' : ''}`}
          style={d.image ? { backgroundImage: `linear-gradient(rgba(36,28,54,.55), rgba(36,28,54,.55)), url("${d.image}")` } : undefined}>
          {t('eyebrow') && <span className="ad-pp-eyebrow">{t('eyebrow')}</span>}
          <h1 className="ad-pp-h1"><Emph text={t('heading') || 'Headline'} /></h1>
          {t('sub') && <p className="ad-pp-sub">{t('sub')}</p>}
          <Button label={t('buttonLabel')} action={d.buttonAction} />
        </section>
      )
    case 'text':
      return (
        <section className="ad-pp-sec ad-pp-text">
          {t('heading') && <h2 className="ad-pp-h2"><Emph text={t('heading')} /></h2>}
          {t('body') ? <Paragraphs text={t('body')} /> : <Placeholder label="Add text in the block settings" />}
        </section>
      )
    case 'imageText':
      return (
        <section className={`ad-pp-sec ad-pp-split${d.imageSide === 'right' ? ' ad-pp-split--rev' : ''}`}>
          <div className="ad-pp-split-img">{d.image ? <img src={d.image} alt="" /> : <Placeholder label="Image" />}</div>
          <div className="ad-pp-split-copy">
            {t('eyebrow') && <span className="ad-pp-eyebrow ad-pp-eyebrow--dark">{t('eyebrow')}</span>}
            {t('heading') && <h2 className="ad-pp-h2"><Emph text={t('heading')} /></h2>}
            <Paragraphs text={t('body')} />
            <Button label={t('buttonLabel')} action={d.buttonAction} />
          </div>
        </section>
      )
    case 'image':
      return (
        <section className={`ad-pp-image${d.width === 'full' ? ' ad-pp-image--full' : ' ad-pp-sec'}`}>
          {d.image ? <img src={d.image} alt="" /> : <Placeholder label="Image" />}
          {t('caption') && <p className="ad-pp-caption">{t('caption')}</p>}
        </section>
      )
    case 'features':
      return (
        <section className="ad-pp-sec">
          {t('heading') && <h2 className="ad-pp-h2 ad-pp-center"><Emph text={t('heading')} /></h2>}
          {t('sub') && <p className="ad-pp-lead ad-pp-center">{t('sub')}</p>}
          <div className="ad-pp-cards">
            {(d.items || []).map((it, i) => (
              <div key={i} className="ad-pp-card">
                <span className="ad-pp-card-ico">{it.icon}</span>
                <strong>{(locale === 'AR' && it.titleAr) || it.title || 'Card title'}</strong>
                <span>{(locale === 'AR' && it.textAr) || it.text}</span>
              </div>
            ))}
            {!(d.items || []).length && <Placeholder label="Add cards in the block settings" />}
          </div>
        </section>
      )
    case 'treatments': {
      const picked = (d.treatments || []).map(slug => services.find(s => s.slug === slug)).filter(Boolean)
      return (
        <section className="ad-pp-sec">
          {t('heading') && <h2 className="ad-pp-h2"><Emph text={t('heading')} /></h2>}
          {t('sub') && <p className="ad-pp-lead">{t('sub')}</p>}
          <div className="ad-pp-cards">
            {picked.map(s => (
              <div key={s.slug} className="ad-pp-card ad-pp-card--tx">
                <span className="ad-pp-card-img">{s.image ? <img src={s.image} alt="" /> : <span aria-hidden="true">✦</span>}</span>
                <strong>{(locale === 'AR' && s.nameAr) || s.name}</strong>
                <span>{s.sub}</span>
                <span className="ad-pp-more">Learn more →</span>
              </div>
            ))}
            {!picked.length && <Placeholder label="Pick treatments in the block settings" />}
          </div>
        </section>
      )
    }
    case 'doctors': {
      const picked = (d.doctors || []).map(slug => doctors.find(x => x.slug === slug)).filter(Boolean)
      return (
        <section className="ad-pp-sec">
          {t('heading') && <h2 className="ad-pp-h2"><Emph text={t('heading')} /></h2>}
          {t('sub') && <p className="ad-pp-lead">{t('sub')}</p>}
          <div className="ad-pp-cards">
            {picked.map(doc => (
              <div key={doc.slug} className="ad-pp-card ad-pp-card--doc">
                <span className="ad-pp-card-img ad-pp-card-img--tall">{doc.image ? <img src={doc.image} alt="" /> : <span aria-hidden="true">⚕</span>}</span>
                <strong>{(locale === 'AR' && doc.nameAr) || doc.name}</strong>
                <span>{(locale === 'AR' && doc.specialistAr) || doc.specialist}</span>
              </div>
            ))}
            {!picked.length && <Placeholder label="Pick doctors in the block settings" />}
          </div>
        </section>
      )
    }
    case 'faq':
      return (
        <section className="ad-pp-sec ad-pp-faq">
          {t('heading') && <h2 className="ad-pp-h2"><Emph text={t('heading')} /></h2>}
          {(d.items || []).map((it, i) => (
            <details key={i} className="ad-pp-q" open={i === 0}>
              <summary>{(locale === 'AR' && it.questionAr) || it.question || 'Question'}</summary>
              <p>{(locale === 'AR' && it.answerAr) || it.answer}</p>
            </details>
          ))}
          {!(d.items || []).length && <Placeholder label="Add questions in the block settings" />}
        </section>
      )
    case 'cta':
      return (
        <section className="ad-pp-cta">
          <h2 className="ad-pp-h2"><Emph text={t('heading') || 'Heading'} /></h2>
          {t('sub') && <p className="ad-pp-sub">{t('sub')}</p>}
          <Button label={t('buttonLabel')} action={d.buttonAction} />
        </section>
      )
    case 'spacer':
      return <div className={`ad-pp-spacer ad-pp-spacer--${d.size || 'small'}`}>{d.size === 'line' && <hr />}</div>
    default:
      return <Placeholder label={`Unknown block “${block.type}”`} />
  }
}

export default function PagePreview({ page, locale, device, selectedId, onSelect, services, doctors }) {
  return (
    <div className={`ad-pp-frame ad-pp-frame--${device}`}>
      <div className="ad-pp-chrome" aria-hidden="true">
        <span /><span /><span />
        <span className="ad-pp-url">kaya.ae/{page.slug || 'your-page'}</span>
      </div>
      <div className={`ad-pp ad-pp--${device}`} dir={locale === 'AR' ? 'rtl' : 'ltr'}>
        {page.blocks.length === 0 && (
          <div className="ad-pp-empty">
            <strong>This page is empty.</strong>
            <span>Add a block from the panel on the left to start building.</span>
          </div>
        )}
        {page.blocks.map(b => (
          <div
            key={b.id}
            className={`ad-pp-block${selectedId === b.id ? ' selected' : ''}${b.hidden ? ' hidden-block' : ''}`}
            onClick={() => onSelect(b.id)}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(b.id) } }}
            aria-label={`${BLOCK_TYPES[b.type]?.label || b.type} block${b.hidden ? ' (hidden)' : ''} — select to edit`}
          >
            <span className="ad-pp-tag">{BLOCK_TYPES[b.type]?.label || b.type}{b.hidden ? ' · hidden' : ''}</span>
            <Block block={b} locale={locale} services={services} doctors={doctors} />
          </div>
        ))}
      </div>
    </div>
  )
}
