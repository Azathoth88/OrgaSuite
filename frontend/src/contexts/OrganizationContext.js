import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const OrganizationContext = createContext();

export const OrganizationProvider = ({ children }) => {
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);

  useEffect(() => {
    console.log('🔍 OrganizationContext: Loading organization...');
    loadOrganization();
  }, []);

  const loadOrganization = async () => {
    try {
      console.log('🔍 Fetching organization from:', `${API_URL}/organization`);
      const response = await axios.get(`${API_URL}/organization`);
      console.log('🔍 Organization response:', response.data);
      
      if (response.data.setupRequired) {
        console.log('✅ Setup required!');
        setSetupRequired(true);
        setOrganization(null);
      } else {
        console.log('✅ Organization found:', response.data.name);
        setOrganization(response.data);
        setSetupRequired(false);
        // Store for i18n
        localStorage.setItem('orgType', response.data.type);
      }
    } catch (error) {
      console.error('❌ Failed to load organization:', error);
      console.log('✅ Assuming setup required due to error');
      setSetupRequired(true);
    } finally {
      setLoading(false);
    }
  };

  const saveOrganization = async (orgData) => {
    try {
      console.log('💾 Saving organization:', orgData);
      const response = await axios.post(`${API_URL}/organization`, orgData);
      console.log('✅ Organization saved:', response.data);
      
      setOrganization(response.data.organization);
      setSetupRequired(false);
      localStorage.setItem('orgType', response.data.organization.type);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to save organization:', error);
      return false;
    }
  };

  const setupDemo = async (orgType) => {
    try {
      console.log('🎮 Setting up demo:', orgType);
      const response = await axios.post(`${API_URL}/organization/setup-demo`, { orgType });
      console.log('✅ Demo setup complete:', response.data);
      
      setOrganization(response.data.organization);
      setSetupRequired(false);
      localStorage.setItem('orgType', response.data.organization.type);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to setup demo:', error);
      return false;
    }
  };

  console.log('🔍 OrganizationContext state:', { 
    organization: organization?.name, 
    loading, 
    setupRequired 
  });

  return (
    <OrganizationContext.Provider value={{
      organization,
      loading,
      setupRequired,
      saveOrganization,
      setupDemo,
      reloadOrganization: loadOrganization
    }}>
      {children}
    </OrganizationContext.Provider>
  );
};