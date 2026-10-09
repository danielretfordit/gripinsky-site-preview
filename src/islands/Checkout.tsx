import { STATIC_PREVIEW, sitePath } from '../lib/deployment';
import { useEffect, useRef, useState } from 'preact/hooks';
import { $pkg, $checkout, type CheckoutRequest } from '../stores/package';
import { quoteSet, quote, quoteBaseOnly, quoteCourse, type Catalog, type Quote, type Selection } from '../lib/pricing';
import { reachGoal } from '../lib/analytics';
import { readUtm } from '../lib/utm';
import { rub, sp, CheckBox } from './ui';
import { detectInApp, isAndroid, androidExternalUrl, copyText, type InAppKind } from '../lib/inapp';

interface Props { cat?: Catalog; months?: number; telegramBot: string }
type Detail = CheckoutRequest;
type Status = 'form' | 'sending' | 'demo' | 'error' | 'redirect';

/** Оформление заказа: состав, контакты, согласие. Сумму считает сервер по тем же правилам. */
export default function Checkout({ cat, months = 12, telegramBot }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  // Время открытия формы: сервер отбрасывает отправки быстрее, чем человек успел бы заполнить поля
  const openedAt = useRef(0);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [sel, setSel] = useState<Selection>($pkg.get());
  const [status, setStatus] = useState<Status>('form');
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [consent, setConsent] = useState(false);
  // Ссылка на оплату и среда: во встроенном браузере (Telegram, VK) банк или СБП могут не открыться
  const [payUrl, setPayUrl] = useState('');
  const [inApp, setInApp] = useState<InAppKind>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => setInApp(detectInApp()), []);

  useEffect(() => $checkout.subscribe((req) => {
    if (!req) return;
    $checkout.set(null);
    setDetail(req);
    setSel($pkg.get());
    setStatus('form');
    setConsent(false);
    setErrors({});
    if (ref.current && !ref.current.open) { openedAt.current = Date.now(); ref.current.showModal(); }
  }), []);

  const q: Quote | null = !detail ? null : detail.kind === 'course' ? quoteCourse(detail, cat?.installmentMonths ?? months)
    : !cat ? null : detail.kind === 'set' ? quoteSet(cat, detail.selection) : detail.kind === 'base' ? quoteBaseOnly(cat, detail.tariff) : quote(cat, sel);
  const discount = q?.lines.reduce((sum, line) => sum + (line.kind === 'item' ? Math.max(0, (line.value ?? line.price) - line.price) : 0), 0) ?? 0;
  const close = () => ref.current?.close();

  const submit = async (e: Event) => {
    e.preventDefault();
    if (STATIC_PREVIEW || !detail) return;
    const form = e.currentTarget as HTMLFormElement;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const errs = {
      name: (data.name ?? '').trim().length < 2,
      email: !/^\S+@\S+\.\S+$/.test(data.email ?? ''),
      phone: (data.phone ?? '').replace(/\D/g, '').length < 10,
      consent: !consent,
    };
    setErrors(errs);
    // Фокус на первое поле с ошибкой. Атрибуты aria-invalid ещё старые (Preact перерисует позже), поэтому ищем по имени
    const first = (['name', 'email', 'phone', 'consent'] as const).find((k) => errs[k]);
    if (first) {
      form.querySelector<HTMLElement>(first === 'consent' ? 'input[type="checkbox"]' : `[name="${first}"]`)?.focus();
      return;
    }
    setStatus('sending');
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: detail.kind,
          selection: detail.kind === 'set' ? detail.selection : detail.kind === 'base' ? { tariff: detail.tariff } : detail.kind === 'course' ? { id: detail.id } : sel,
          customer: { name: data.name, email: data.email, phone: data.phone },
          consent: true,
          utm: readUtm(),
          page: location.pathname,
          started: openedAt.current || undefined,
        }),
      });
      const out = await res.json();
      if (!res.ok || !out.ok) throw new Error(out.error ?? String(res.status));
      reachGoal('checkout_redirect', { mode: out.mode, sum: out.total });
      if (out.redirect) {
        // Переход в том же окне (window.open во встроенных браузерах блокируется). Во встроенном браузере
        // сначала показываем запасные пути: если банк не откроется, человек не останется без ссылки.
        setPayUrl(out.redirect);
        setStatus('redirect');
        setTimeout(() => location.assign(out.redirect), detectInApp() ? 600 : 0);
        return;
      }
      setStatus('demo');
    } catch {
      setStatus('error');
    }
  };

  return (
    <dialog ref={ref} aria-labelledby="checkout-title"
      class="m-auto w-[min(640px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-y-auto overscroll-contain rounded-card border border-line-strong bg-bg-2 p-0 text-ink backdrop:bg-[rgb(17_19_19/0.8)]"
      onClick={(e) => { if (e.target === ref.current) close(); }}>
      <div class="flex flex-col gap-5 p-5 sm:p-8">
        <div class="flex items-start justify-between gap-4">
          <h2 id="checkout-title" class="t-h3">{STATIC_PREVIEW ? 'Ваш выбор в демоверсии' : status === 'demo' ? 'Заявка принята' : detail?.kind === 'course' ? 'Оформление курса' : 'Оформление пакета'}</h2>
          <button type="button" onClick={close} aria-label="Закрыть" class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-field border border-line-strong bg-transparent text-xl">×</button>
        </div>

        {q && <div class="t-small flex flex-col gap-1.5 rounded-card bg-bg p-4">
          {q.lines.map((l) => (
            <div key={l.id} class="flex justify-between gap-3">
              <span class="text-ink-2">{l.name}</span>
              <b class="whitespace-nowrap">{l.kind === 'item' || l.kind === 'format' ? (l.price ? rub(l.price) : 'включено') : l.kind === 'included' ? 'входит' : 'в подарок'}</b>
            </div>
          ))}
          <div class="mt-2 flex justify-between gap-3 border-t border-line pt-3"><span class="text-ink-2">Полная стоимость</span><b class="whitespace-nowrap">{rub(q.total + discount)}</b></div>
          <div class="flex justify-between gap-3"><span class="text-ink-2">Сумма скидки</span><b class="whitespace-nowrap">{discount ? `−${rub(discount)}` : rub(0)}</b></div>
          <div class="mt-2 flex items-baseline justify-between border-t border-line pt-2">
            <span class="font-semibold">К оплате</span>
            <span class="text-right"><b class="t-h3">{rub(q.total)}</b><span class="t-caption block text-muted">или {sp(q.monthly)}&nbsp;₽/мес в рассрочку</span></span>
          </div>
        </div>}

        {STATIC_PREVIEW ? (
          <div class="flex flex-col gap-4" role="status">
            <p class="m-0 text-ink-2">Это промежуточная версия для просмотра. Состав и стоимость можно проверить, оформление заказа и оплата здесь пока не подключены.</p>
            <button type="button" class="btn btn-secondary" onClick={close}>Продолжить просмотр</button>
          </div>
        ) : status === 'redirect' ? (
          <div class="flex flex-col gap-4" role="status">
            <p class="m-0 text-ink-2">Открываем страницу оплаты…</p>
            {inApp && (
              <div class="flex flex-col gap-3 border-t border-line pt-4">
                <p class="t-small m-0 text-ink-2">Если оплата не открылась или банк не запускается, откройте страницу в обычном браузере: так работают СБП и приложения банков.</p>
                <div class="flex flex-wrap gap-3">
                  <a href={payUrl} class="btn btn-primary">Открыть оплату</a>
                  {isAndroid() && <a href={androidExternalUrl(payUrl)} class="btn btn-secondary">Открыть в браузере</a>}
                  <button type="button" class="btn btn-secondary" onClick={async () => setCopied(await copyText(payUrl))}>{copied ? 'Ссылка скопирована' : 'Скопировать ссылку'}</button>
                </div>
              </div>
            )}
          </div>
        ) : status === 'demo' ? (
          <div class="flex flex-col gap-3" role="status">
            <p class="m-0 text-ink-2">Это пилотная версия сайта: онлайн-оплата подключается после настройки GetCourse. Мы получили состав заказа и ваши контакты, менеджер свяжется с вами и пришлёт ссылку на оплату.</p>
            <div class="flex flex-wrap gap-3">
              <button type="button" class="btn btn-primary" onClick={close}>Понятно</button>
              <a href={`${telegramBot}?start=installment`} class="btn btn-secondary">Рассрочка через Telegram</a>
            </div>
          </div>
        ) : (
          <form class="flex flex-col gap-4" onSubmit={submit} noValidate>
            <p class="t-caption text-muted m-0">Все контактные поля обязательны для заполнения.</p>
            <Field id="co-name" name="name" label="Имя и фамилия" autoComplete="name" error={errors.name} msg="Напишите имя" />
            <div class="grid gap-4 sm:grid-cols-2">
              <Field id="co-email" name="email" type="email" label="Почта (для доступа к курсам)" autoComplete="email" error={errors.email} msg="Проверьте почту" />
              <Field id="co-phone" name="phone" type="tel" label="Телефон" autoComplete="tel" error={errors.phone} msg="Проверьте телефон" />
            </div>
            <label class="t-small flex cursor-pointer items-start gap-3 leading-snug text-ink-2">
              <input type="checkbox" class="sr-only" checked={consent} onChange={() => setConsent(!consent)} aria-invalid={errors.consent} />
              <span class="mt-0.5"><CheckBox on={consent} /></span>
              <span>Даю <a href={sitePath('/soglasie')} class="underline" target="_blank">согласие на обработку персональных данных</a> и принимаю <a href={sitePath('/oferta')} class="underline" target="_blank">договор оферты</a></span>
            </label>
            {errors.consent && <span class="t-caption text-danger" role="alert">Без согласия мы не сможем оформить заказ</span>}
            <button type="submit" class="btn btn-primary btn-lg btn-block" disabled={status === 'sending'}>{status === 'sending' ? 'Отправляем…' : 'Перейти к оплате'}</button>
            {status === 'error' && (
              <span class="t-small text-ink-2" role="alert">Не получилось оформить заказ. Напишите нам в <a href={telegramBot} class="link">Telegram</a>, поможем.</span>
            )}
            <span class="t-caption text-muted">Оплата картой, СБП, частями или в рассрочку. Доступ к урокам придёт на почту.</span>
          </form>
        )}
      </div>
    </dialog>
  );
}

function Field({ id, name, label, type = 'text', autoComplete, error, msg }: { id: string; name: string; label: string; type?: string; autoComplete: string; error?: boolean; msg: string }) {
  return (
    <div class="flex flex-col gap-2">
      <label for={id} class="t-small font-semibold">{label} <span class="text-muted" aria-hidden="true">*</span></label>
      <input id={id} name={name} type={type} autoComplete={autoComplete} inputMode={type === 'tel' ? 'tel' : type === 'email' ? 'email' : undefined} enterKeyHint="next" autoCapitalize={type === 'text' ? 'words' : 'off'} spellcheck={false} required aria-required="true" class="field" aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} />
      {error && <span id={`${id}-err`} class="t-caption text-danger" role="alert">{msg}</span>}
    </div>
  );
}
