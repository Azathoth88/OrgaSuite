import { useTranslation } from 'react-i18next';
import { useContext, useEffect } from 'react';
import { OrganizationContext } from '../contexts/OrganizationContext';
import { updateTranslationsForOrgType } from '../i18n';

export const useOrgTranslation = () => {
  const { t, i18n, ready } = useTranslation();
  const { organization } = useContext(OrganizationContext);

  useEffect(() => {
    if (organization?.type) {
      console.log('🔄 Organization type detected:', organization.type);
      updateTranslationsForOrgType(organization.type, i18n.language);
    }
  }, [organization?.type, i18n.language]);

  // Safe t function that always returns something
  const safeT = (key, fallback, options = {}) => {
    if (!ready) {
      return fallback || key;
    }
    
    const translation = t(key, fallback, options);
    return translation || fallback || key;
  };

  return { 
    t: safeT, 
    i18n, 
    organization,
    currentLanguage: i18n.language,
    ready
  };
};