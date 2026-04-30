import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { login, checkSso } from '../../api/auth';
import { Spin } from 'antd';

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);
  const accessToken = useAuthStore((state) => state.accessToken);

  const from = location.state?.from?.pathname || '/profile';

  // Silent SSO Check
  React.useEffect(() => {
    const performSso = async () => {
      // If already logged in, redirect away
      if (accessToken) {
        navigate(from, { replace: true });
        return;
      }

      try {
        const data = await checkSso();
        if (data && data.access_token) {
          setAuth({
            accessToken: data.access_token,
            role: data.user.role,
            full_name: data.user.full_name,
            sam_account_name: data.user.sam_account_name,
            is_verified: data.user.is_verified,
            grace_period_left: data.user.grace_period_left,
          });
          message.success('Автоматический вход (SSO)...');
          navigate(from, { replace: true });
        }
      } catch (error) {
        // SSO failed or not available, just stop loading and show login form
        console.log('SSO not available or failed');
      } finally {
        setSsoLoading(false);
      }
    };

    performSso();
  }, []);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const data = await login(values.username, values.password);
      setAuth({
        accessToken: data.access_token,
        role: data.user.role,
        full_name: data.user.full_name,
        sam_account_name: data.user.sam_account_name,
        is_verified: data.user.is_verified,
        grace_period_left: data.user.grace_period_left,
      });
      message.success('Успешный вход!');
      navigate(from, { replace: true });
    } catch (error: any) {
      if (error.response?.status === 401) {
        message.error('Неверный логин или пароль');
      } else {
        message.error('Ошибка при входе. Попробуйте позже.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (ssoLoading) {
    return (
      <div className="login-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Проверка доступа..." />
      </div>
    );
  }

  return (
    <div className="login-container">
      <Card className="glass-card" style={{ width: 400, padding: '20px' }} bordered={false}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <Title level={2} style={{ marginBottom: '8px' }}>Smart Contacts</Title>
          <Text type="secondary">Войдите, используя ваш AD-аккаунт</Text>
        </div>
        
        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Введите AD-логин' }]}
          >
            <Input 
              prefix={<UserOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} 
              placeholder="AD Логин (например, ivanov_ii)" 
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Введите пароль' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
              placeholder="Пароль"
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading} 
              block 
              style={{ height: '45px', borderRadius: '8px', marginTop: '10px' }}
            >
              Войти
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;
