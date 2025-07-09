import React from 'react';
import { useOrgTranslation } from '../hooks/useOrgTranslation';

const LanguageSwitcher = () => {
  const { i18n, currentLanguage, ready } = useOrgTranslation();

  const languages = [
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'en', name: 'English', flag: '🇺🇸' }
  ];

  const changeLanguage = async (langCode) => {
    if (!ready) {
      console.warn('⚠️ i18n not ready yet');
      return;
    }
    
    console.log(`🌍 Changing language to: ${langCode}`);
    
    try {
      await i18n.changeLanguage(langCode);
      console.log(`✅ Language changed to: ${langCode}`);
    } catch (error) {
      console.error('❌ Failed to change language:', error);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="text-xs text-blue-100">Language:</span>
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => changeLanguage(lang.code)}
          disabled={!ready}
          className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
            currentLanguage === lang.code
              ? 'bg-blue-500 text-white'
              : 'text-blue-100 hover:text-white hover:bg-blue-500'
          }`}
        >
          <span>{lang.flag}</span>
          <span>{lang.name}</span>
        </button>
      ))}
      {!ready && <span className="text-xs text-blue-200">⏳</span>}
    </div>
  );
};

export default LanguageSwitcher;