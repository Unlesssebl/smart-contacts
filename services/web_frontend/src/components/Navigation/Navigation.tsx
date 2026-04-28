import React from 'react';
import { Layout, Menu, Button, Space } from 'antd';
import { 
  TeamOutlined, 
  UserOutlined, 
  SettingOutlined, 
  LogoutOutlined 
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const { Header } = Layout;

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, full_name, sam_account_name, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    {
      key: '/directory',
      icon: <TeamOutlined />,
      label: 'Справочник',
      onClick: () => navigate('/directory')
    },
    {
      key: '/profile',
      icon: <UserOutlined />,
      label: 'Профиль',
      onClick: () => navigate('/profile')
    }
  ];

  if (role === 'it_operator') {
    menuItems.push({
      key: '/admin',
      icon: <SettingOutlined />,
      label: 'Админка',
      onClick: () => navigate('/admin')
    });
  }

  return (
    <Header style={{ 
      display: 'flex', 
      alignItems: 'center', 
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(8px)',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
      padding: '0 24px'
    }}>
      <div style={{ 
        fontWeight: 'bold', 
        fontSize: '18px', 
        marginRight: '48px',
        color: '#1677ff'
      }}>
        Smart Contacts
      </div>
      
      <Menu
        mode="horizontal"
        selectedKeys={[location.pathname]}
        items={menuItems}
        style={{ flex: 1, border: 'none', background: 'transparent' }}
      />

      <Space>
        {(full_name || sam_account_name) && (
          <span style={{ marginRight: '12px', fontSize: '14px', color: '#595959' }}>
            {full_name || sam_account_name}
          </span>
        )}
        <Button 
          type="text" 
          icon={<LogoutOutlined />} 
          onClick={handleLogout}
        >
          Выйти
        </Button>
      </Space>
    </Header>
  );
};

export default Navigation;
