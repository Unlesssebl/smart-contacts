import React from 'react';
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import Navigation from '../Navigation/Navigation';

const MainLayout: React.FC = () => {
  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Navigation />
      <Outlet />
    </Layout>
  );
};

export default MainLayout;
