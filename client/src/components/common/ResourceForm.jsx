import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Checkbox, Field, Input, Select, Switch, Textarea } from '../ui';
import { cn } from '../../lib/utils';

/**
 * Declarative form used by the generic CRUD pages and detail screens.
 * A field definition looks like:
 * { name, label, type, options, required, help, placeholder, span, rows }
 */
export default function ResourceForm({
  fields = [],
  defaultValues = {},
  onSubmit,
  onCancel,
  loading = false,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  className,
}) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ defaultValues });

  useEffect(() => {
    reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(defaultValues)]);

  const submit = handleSubmit(async (values) => {
    await onSubmit?.(values);
  });

  const optionsFor = (field) => {
    if (!field.options) return [];
    return field.options.map((option) => (typeof option === 'string' ? { value: option, label: option } : option));
  };

  return (
    <form onSubmit={submit} className={cn('space-y-4', className)}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((field) => {
          if (field.type === 'hidden') {
            return <input key={field.name} type="hidden" {...register(field.name)} />;
          }
          if (typeof field.render === 'function') {
            return (
              <div key={field.name || field.label} className={cn(field.span === 2 && 'sm:col-span-2', field.span === 3 && 'sm:col-span-2')}>
                {field.render({ register, errors, values: defaultValues })}
              </div>
            );
          }

          const common = {
            label: field.label,
            error: errors[field.name]?.message,
            help: field.help,
            required: field.required,
            placeholder: field.placeholder,
            disabled: field.disabled,
            ...register(field.name, {
              required: field.required ? `${field.label || field.name} is required.` : false,
              setValueAs: field.type === 'number'
                ? (value) => (value === '' || value === null || value === undefined ? null : Number(value))
                : undefined,
            }),
          };

          const wrapperClass = cn(field.span === 2 && 'sm:col-span-2', field.span === 3 && 'sm:col-span-2');

          if (field.type === 'textarea') {
            return <Textarea key={field.name} {...common} className={wrapperClass} rows={field.rows || 3} />;
          }
          if (field.type === 'select') {
            return (
              <Select key={field.name} {...common} className={wrapperClass}>
                {field.placeholder !== false ? <option value="">{field.placeholder || `Select ${field.label || field.name}`}</option> : null}
                {optionsFor(field).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            );
          }
          if (field.type === 'checkbox') {
            return (
              <div key={field.name} className={cn('pt-6', wrapperClass)}>
                <Checkbox label={field.label} {...register(field.name)} />
                {field.help ? <p className="mt-1 text-xs text-muted">{field.help}</p> : null}
              </div>
            );
          }
          if (field.type === 'switch') {
            return (
              <div key={field.name} className={cn('sm:col-span-2', wrapperClass)}>
                <Field label={field.label} error={errors[field.name]?.message} help={field.help}>
                  <label className="flex items-center gap-2 text-sm text-ink">
                    <input type="checkbox" className="checkbox" {...register(field.name)} />
                    {field.switchLabel || 'Enabled'}
                  </label>
                </Field>
              </div>
            );
          }
          return (
            <Input
              key={field.name}
              {...common}
              className={wrapperClass}
              type={field.type || 'text'}
              step={field.step}
              min={field.min}
              max={field.max}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
        {onCancel ? <Button type="button" variant="secondary" onClick={onCancel}>{cancelLabel}</Button> : null}
        <Button type="submit" loading={loading}>{submitLabel}</Button>
      </div>
    </form>
  );
}
