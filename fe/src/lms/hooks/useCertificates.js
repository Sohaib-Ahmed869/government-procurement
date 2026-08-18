import { useEffect, useState } from 'react';
import { certificatesApi } from '../../api/lms.js';

// The learner's earned certificates (L4), from the API.
//
// Issuing happens on the server when the last lesson is completed. There is no
// client path to minting one, and there shouldn't be: a certificate the browser
// can create is not evidence of anything, and its credential ID has to resolve
// against a record for /verify to mean something.
//
// Each record carries a `design` snapshot taken when it was earned, so the
// document still reads the way it did then even if the instructor has since
// reworded the course's certificate.
export function useCertificates() {
  const [certificates, setCertificates] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await certificatesApi.mine();
        if (!alive) return;
        setCertificates(rows ?? []);
        setStatus('ready');
      } catch (err) {
        if (!alive) return;
        setError(err?.message ?? 'Could not load your certificates');
        setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { certificates, status, error };
}

export function useCertificate(id) {
  const [certificate, setCertificate] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound | error
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    (async () => {
      try {
        const row = await certificatesApi.get(id);
        if (!alive) return;
        setCertificate(row);
        setStatus('ready');
      } catch (err) {
        if (!alive) return;
        // 404 means it isn't theirs or doesn't exist, which reads differently
        // from the server being unreachable.
        if (err?.status === 404) {
          setStatus('notfound');
          return;
        }
        setError(err?.message ?? 'Could not load this certificate');
        setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  return { certificate, status, error };
}
