import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const SettingsContext = createContext();

const defaultSettings = {
  institution_name: 'Microfinance Institution',
  tagline: 'Registered Non-Banking Financial Company (NBFC - MFI)',
  cin_number: 'U65929RJ2024NPL089123',
  branch_code: 'BR-001',
  phone: '+91 99910 95051',
  email: 'info@microfinance.com',
  address: 'Main Branch Office',
  city: 'Narnaul',
  state: 'Haryana',
  pincode: '123001',
  default_interest_rate: '14.5',
  default_processing_fee: '2.0',
  annual_penalty_rate: '24.0',
  default_penalty_rate: '0.0658',
  grace_period: '5',
  max_loan_limit: '200000',
  receipt_terms: 'All payments are non-refundable. Please keep this official receipt for future reference.',
  signatory_name: 'Authorized Signatory',
  signatory_title: 'Authorized Officer'
};

const getInitialSettings = () => {
  try {
    const cached = localStorage.getItem('microfin_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === 'object') {
        return { ...defaultSettings, ...parsed };
      }
    }
  } catch (err) {
    console.warn('Failed to read microfin_settings from localStorage', err);
  }
  return defaultSettings;
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(getInitialSettings);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const res = await api.get('settings');
      const fetched = res?.data?.settings || res?.data || res?.settings;
      if (res?.success && fetched && typeof fetched === 'object') {
        setSettings((prev) => {
          const merged = { ...prev, ...fetched };
          try {
            localStorage.setItem('microfin_settings', JSON.stringify(merged));
          } catch (e) {}
          return merged;
        });
      }
    } catch (err) {
      console.error('Error fetching settings in SettingsContext:', err);
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  const updateLocalSettings = useCallback((newSettings) => {
    if (!newSettings || typeof newSettings !== 'object') return;
    setSettings((prev) => {
      const merged = { ...prev, ...newSettings };
      try {
        localStorage.setItem('microfin_settings', JSON.stringify(merged));
      } catch (e) {}
      return merged;
    });
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings?.institution_name) {
      document.title = `${settings.institution_name} — Loan Portal`;
    }
  }, [settings?.institution_name]);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loadingSettings,
        refreshSettings: fetchSettings,
        updateLocalSettings
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

