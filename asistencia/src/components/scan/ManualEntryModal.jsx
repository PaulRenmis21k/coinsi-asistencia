import { useEffect, useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Field from '../ui/Field.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { extractDni } from '../../lib/format.js';

export default function ManualEntryModal({ open, prefill, reason, onSubmit, onClose }) {
  const { padronIndex } = useApp();
  const [dni, setDni] = useState('');
  const [nombres, setNombres] = useState('');
  const [escuela, setEscuela] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setDni(prefill?.dni || '');
    setNombres(prefill?.nombres || '');
    setEscuela(prefill?.escuela || '');
    setError('');
  }, [open, prefill]);

  const person = dni.length === 8 ? padronIndex.get(dni) : null;

  const handleDni = (event) => {
    const next = event.target.value.replace(/\D/g, '').slice(0, 8);
    setDni(next);
    setError('');
    if (next.length === 8) {
      const found = padronIndex.get(next);
      if (found) {
        if (!nombres.trim()) setNombres(found.nombres || '');
        if (!escuela.trim()) setEscuela(found.escuela || '');
      }
    }
  };

  const submit = (event) => {
    event.preventDefault();
    const cleanDni = extractDni(dni);
    if (!cleanDni) {
      setError('Ingresa un DNI válido de 8 dígitos.');
      return;
    }
    if (!nombres.trim()) {
      setError('Escribe los nombres y apellidos del asistente.');
      return;
    }
    onSubmit({ dni: cleanDni, nombres, escuela });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ingreso manual"
      description="Registra la asistencia cuando el DNI no está en el padrón o la lectura falla."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit}>
            Registrar asistente
          </Button>
        </>
      }
    >
      {reason ? (
        <p className="inline-note inline-note--warning" role="status">
          {reason}
        </p>
      ) : null}

      <form className="form-stack" onSubmit={submit}>
        <Field
          label="DNI"
          htmlFor="manual-dni"
          hint="Ocho dígitos, sin puntos ni espacios."
          error={error && !dni ? error : ''}
        >
          <input
            id="manual-dni"
            className="input input--mono"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="00000000"
            value={dni}
            onChange={handleDni}
            maxLength={8}
            data-autofocus
          />
        </Field>

        {person ? (
          <p className="inline-note inline-note--success">
            Encontrado en el padrón: <strong>{person.nombres}</strong>
            {person.escuela ? ` · ${person.escuela}` : ''}
          </p>
        ) : null}

        <Field label="Nombres y apellidos" htmlFor="manual-nombres">
          <input
            id="manual-nombres"
            className="input"
            type="text"
            autoComplete="off"
            placeholder="APELLIDOS, NOMBRES"
            value={nombres}
            onChange={(event) => {
              setNombres(event.target.value);
              setError('');
            }}
          />
        </Field>

        <Field label="Escuela profesional" htmlFor="manual-escuela" optional>
          <input
            id="manual-escuela"
            className="input"
            type="text"
            autoComplete="off"
            placeholder="Ingeniería de Sistemas"
            value={escuela}
            onChange={(event) => setEscuela(event.target.value)}
          />
        </Field>

        {error && dni ? (
          <p className="field__error" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className="sr-only">
          Registrar asistente
        </button>
      </form>
    </Modal>
  );
}
