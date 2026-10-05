import { useEffect, useRef, useState } from 'preact/hooks';
import { $pkg, $checkout, type CheckoutRequest } from '../stores/package';
import { quote, quoteBaseOnly, quoteCourse, type Catalog, type Quote, type Selection } from '../lib/pricing';
import { reachGoal } from '../lib/analytics';
import { readUtm } from '../lib/utm';
import { rub, sp, CheckBox } from './ui';

interface Props { cat?: Catalog; months?: number; telegramBot: string }
type Detail = CheckoutRequest;
type Status = 'form' | 'sending' | 'demo' | 'error';

/** Оформление заказа: состав, контакты, согласие. Сумму считает сервер по тем же правилам. */
export default function Checkout({ cat, months = 12, telegramBot }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [detail, setDetail] = useState<Detail>({ kind: 'package' });
  const [sel, setSel] = useState<Selection>($pkg.get());
  const [status, setStatus] = useState<Status>('form');
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [consent, setConsent] = useState(false);

  useEffect(() => $checkout.subscribe((req) => {
    if (!req) return;
    $checkout.set(null);
    setDetail(req);
    setSel($pkg.get());
    setStatus('form');
    setErrors({});
    if (ref.current && !ref.current.open) ref.current.showModal();
  }), []);

  const q: Quote | null = detail.kind === 'course' ? quoteCourse(detail, cat?.installmentMonths ?? months)
    : !cat ? null : detail.kind === 'base' ? quoteBaseOnly(cat, detail.tariff) : quote(cat, sel);
  const close = () => ref.current?.close();

  const submit = async (e: Event) => {
    e.preventDefault();
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
          selection: detail.kind === 'base' ? { tariff: detail.tariff } : detail.kind === 'course' ? { id: detail.id } : sel,
          customer: { name: data.name, email: data.email, phone: data.phone },
          consent: true,
          utm: readUtm(),
          page: location.pathname,
        }),
      });
      const out = await res.json();
      if (!res.ok || !out.ok) throw new Error(out.error ?? String(res.status));
      reachGoal('checkout_redirect', { mode: out.mode, sum: out.total });
      if (out.redirect) { location.href = out.redirect; return; }
      setStatus('demo');
    } catch {
      setStatus('error');
    }
  };

  return (
    <dialog ref={ref} aria-labelledby="checkout-title"
      class="m-auto w-[min(640px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-y-auto overscroll-contain rounded-[24px] border border-line-strong bg-bg-2 p-0 text-ink backdrop:bg-[rgb(6_16_18/0.8)]"
      onClick={(e) => { if (e.target === ref.current) close(); }}>
      <div class="flex flex-col gap-5 p-5 sm:p-8">
        <div class="flex items-start justify-between gap-4">
          <h2 id="checkout-title" class="t-h3">{status === 'demo' ? 'Заявка принята' : detail.kind === 'course' ? 'Оформление курса' : 'Оформление пакета'}</h2>
          <button type="button" onClick={close} aria-label="Закрыть" class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line-strong bg-transparent text-xl">×</button>
        </div>

        {q && <div class="flex flex-col gap-1.5 rounded-2xl bg-bg p-4 text-[15px]">
          {q.lines.map((l) => (
            <div key={l.id} class="flex justify-between gap-3">
              <span class="text-ink-2">{l.name}</span>
              <b class="whitespace-nowrap">{l.kind === 'item' || l.kind === 'format' ? (l.price ? rub(l.price) : 'включено') : l.kind === 'included' ? 'входит' : 'в подарок'}</b>
            </div>
          ))}
          <div class="mt-2 flex items-baseline justify-between border-t border-line pt-2">
            <span class="font-semibold">Итого</span>
            <span class="text-right"><b class="text-[22px]">{rub(q.total)}</b><span class="block text-[13px] text-muted">или {sp(q.monthly)}&nbsp;₽/мес в рассрочку</span></span>
          </div>
        </div>}

        {status === 'demo' ? (
          <div class="flex flex-col gap-3" role="status">
            <p class="m-0 text-ink-2">Это пилотная версия сайта: онлайн-оплата подключается после настройки GetCourse. Мы получили состав заказа и ваши контакты, менеджер свяжется с вами и пришлёт ссылку на оплату.</p>
            <div class="flex flex-wrap gap-3">
              <button type="button" class="btn btn-primary" onClick={close}>Понятно</button>
              <a href={`${telegramBot}?start=installment`} class="btn btn-secondary">Рассрочка через Telegram</a>
            </div>
          </div>
        ) : (
          <form class="flex flex-col gap-4" onSubmit={submit} noValidate>
            <Field id="co-name" name="name" label="Имя и фамилия" autoComplete="name" error={errors.name} msg="Напишите имя" />
            <div class="grid gap-4 sm:grid-cols-2">
              <Field id="co-email" name="email" type="email" label="Почта (для доступа к курсам)" autoComplete="email" error={errors.email} msg="Проверьте почту" />
              <Field id="co-phone" name="phone" type="tel" label="Телефон" autoComplete="tel" error={errors.phone} msg="Проверьте телефон" />
            </div>
            <label class="flex cursor-pointer items-start gap-3 text-[14px] leading-snug text-ink-2">
              <input type="checkbox" class="sr-only" checked={consent} onChange={() => setConsent(!consent)} aria-invalid={errors.consent} />
              <span class="mt-0.5"><CheckBox on={consent} /></span>
              <span>Даю <a href="/soglasie" class="underline" target="_blank">согласие на обработку персональных данных</a> и принимаю <a href="/oferta" class="underline" target="_blank">договор оферты</a></span>
            </label>
            {errors.consent && <span class="text-[13px] text-[#ff8a80]" role="alert">Без согласия мы не сможем оформить заказ</span>}
            <button type="submit" class="btn btn-primary btn-lg btn-block" disabled={status === 'sending'}>{status === 'sending' ? 'Отправляем…' : 'Перейти к оплате'}</button>
            {status === 'error' && (
              <span class="text-[15px] text-ink-2" role="alert">Не получилось оформить заказ. Напишите нам в <a href={telegramBot} class="link">Telegram</a>, поможем.</span>
            )}
            <span class="text-[13px] text-muted">Оплата картой, СБП, частями или в рассрочку. Доступ к урокам придёт на почту.</span>
          </form>
        )}
      </div>
    </dialog>
  );
}

function Field({ id, name, label, type = 'text', autoComplete, error, msg }: { id: string; name: string; label: string; type?: string; autoComplete: string; error?: boolean; msg: string }) {
  return (
    <div class="flex flex-col gap-2">
      <label for={id} class="text-[15px] font-semibold">{label}</label>
      <input id={id} name={name} type={type} autoComplete={autoComplete} class="field" aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} />
      {error && <span id={`${id}-err`} class="text-[13px] text-[#ff8a80]" role="alert">{msg}</span>}
    </div>
  );
}
