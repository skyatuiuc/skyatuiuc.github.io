import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useRoster } from '../context/RosterContext';

/**
 * Portal tab + active retreat kept in the URL (/admin/groups?retreat=retreat-123), so refresh keeps
 * your place, Back works, and a link can be shared with another volunteer.
 * @param {string} basePath '/admin' or '/volunteer'
 * @param {string[]} tabIds valid tab slugs; the first is the default
 */
export function usePortalUrlState(basePath, tabIds) {
  const { tab } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = tabIds.includes(tab) ? tab : tabIds[0];

  const setActiveTab = useCallback((id) => {
    navigate({ pathname: `${basePath}/${id}`, search: location.search });
  }, [navigate, basePath, location.search]);

  // ?retreat= wins once, on arrival; afterwards the URL follows the selector
  const [params, setParams] = useSearchParams();
  const urlRetreatId = params.get('retreat');
  const { activeRetreatId, setActiveRetreatId } = useRoster();
  const [arrivalApplied, setArrivalApplied] = useState(!urlRetreatId);

  useEffect(() => {
    if (arrivalApplied) return;
    setActiveRetreatId(urlRetreatId);
    setArrivalApplied(true);
  }, [arrivalApplied, urlRetreatId, setActiveRetreatId]);

  useEffect(() => {
    if (!arrivalApplied || !activeRetreatId || urlRetreatId === activeRetreatId) return;
    const next = new URLSearchParams(params);
    next.set('retreat', activeRetreatId);
    setParams(next, { replace: true });
  }, [arrivalApplied, activeRetreatId, urlRetreatId, params, setParams]);

  return { activeTab, setActiveTab };
}
