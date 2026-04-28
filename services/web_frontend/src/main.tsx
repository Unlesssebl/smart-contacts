import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import { router } from './router';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff', // Основной синий
          borderRadius: 12,
          fontFamily: 'Inter, sans-serif',
        },
        components: {
          Card: {
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
          },
          Button: {
            borderRadius: 8,
            controlHeight: 40,
          }
        }
      }}
    >
      <RouterProvider router={router} />
    </ConfigProvider>
  </React.StrictMode>
);
