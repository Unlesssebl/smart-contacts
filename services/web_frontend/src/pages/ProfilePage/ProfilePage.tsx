import React, { useState, useEffect } from 'react';
import { 
  Layout, Row, Col, Card, Typography, Form, Input, Button, Table, 
  Tag, message, Descriptions, Alert 
} from 'antd';
import { 
  UserOutlined, PhoneOutlined, HomeOutlined, 
  HistoryOutlined, SaveOutlined 
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { getMe } from '../../api/auth';
import type { UserProfile } from '../../api/users';
import { getMyRequests, createChangeRequest } from '../../api/changeRequests';
import type { ChangeRequest } from '../../api/changeRequests';
import GatekeeperModal from '../../components/GatekeeperModal/GatekeeperModal';

const { Content } = Layout;
const { Text } = Typography;

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [gkVisible, setGkVisible] = useState(false);
  
  const { is_verified, grace_period_left, adSyncUnavailable } = useAuthStore();

  const fetchData = async () => {
    try {
      const [userData, requestsData] = await Promise.all([
        getMe(),
        getMyRequests()
      ]);
      setUser(userData);
      setRequests(requestsData);
      
      // Show Gatekeeper if not verified
      if (!userData.is_verified) {
        setGkVisible(true);
      }
    } catch (e) {
      message.error('Ошибка загрузки данных');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      await createChangeRequest(values);
      message.success('Заявка на изменение данных отправлена');
      fetchData(); // Refresh requests
      
      // If we were under Gatekeeper, auto-verify is handled by API
      if (!is_verified) {
        useAuthStore.getState().updateVerification(true);
        setGkVisible(false);
      }
    } catch (e) {
      message.error('Ошибка при отправке заявки');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Поле',
      dataIndex: 'field_name',
      key: 'field_name',
      render: (text: string) => {
        const labels: any = {
          internal_phone: 'Внутренний тел.',
          mobile_phone: 'Мобильный тел.',
          office_location: 'Кабинет'
        };
        return labels[text] || text;
      }
    },
    {
      title: 'Новое значение',
      dataIndex: 'new_value',
      key: 'new_value',
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: any = {
          pending: 'processing',
          approved: 'success',
          rejected: 'error',
          conflict: 'warning'
        };
        const labels: any = {
          pending: 'Ожидает',
          approved: 'Одобрено',
          rejected: 'Отклонено',
          conflict: 'Конфликт'
        };
        return <Tag color={colors[status]}>{labels[status] || status}</Tag>;
      }
    },
    {
      title: 'Дата',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString()
    }
  ];

  if (!user) return null;

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Content style={{ padding: '40px 24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        
        {adSyncUnavailable && (
          <Alert
            message="Синхронизация с AD временно недоступна"
            description="Изменения будут сохранены во внутренней базе и синхронизированы позже."
            type="warning"
            showIcon
            style={{ marginBottom: '24px', borderRadius: '12px' }}
          />
        )}

        <Row gutter={[24, 24]}>
          {/* User Info & Edit Form */}
          <Col xs={24} lg={10}>
            <Card 
              className="glass-card" 
              title={<><UserOutlined /> Данные профиля</>}
              style={{ borderRadius: '12px' }}
            >
              <Descriptions column={1} size="small" style={{ marginBottom: '24px' }}>
                <Descriptions.Item label="ФИО">{user.full_name}</Descriptions.Item>
                <Descriptions.Item label="Отдел">{user.department}</Descriptions.Item>
                <Descriptions.Item label="Должность">{user.job_title}</Descriptions.Item>
              </Descriptions>
              
              <Text type="secondary" style={{ display: 'block', marginBottom: '16px', fontSize: '12px' }}>
                Поля выше синхронизируются из Active Directory и недоступны для редактирования.
              </Text>

              <Form
                layout="vertical"
                initialValues={{
                  internal_phone: user.internal_phone,
                  mobile_phone: user.mobile_phone,
                  office_location: user.office_location,
                }}
                onFinish={onFinish}
              >
                <Form.Item 
                  label="Внутренний телефон" 
                  name="internal_phone"
                  help="Формат: 00-00"
                >
                  <Input prefix={<PhoneOutlined />} placeholder="99-99" />
                </Form.Item>

                <Form.Item 
                  label="Мобильный телефон" 
                  name="mobile_phone"
                  help="Формат: +7 (999) 999-99-99"
                >
                  <Input prefix={<PhoneOutlined />} placeholder="+7 (___) ___-__-__" />
                </Form.Item>

                <Form.Item label="Кабинет" name="office_location">
                  <Input prefix={<HomeOutlined />} placeholder="Например, 401а" />
                </Form.Item>

                <Form.Item>
                  <Button 
                    type="primary" 
                    icon={<SaveOutlined />} 
                    htmlType="submit" 
                    loading={submitting}
                    disabled={adSyncUnavailable}
                    block
                  >
                    {adSyncUnavailable ? 'Отправка заблокирована' : 'Сохранить изменения'}
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          {/* Request History */}
          <Col xs={24} lg={14}>
            <Card 
              className="glass-card" 
              title={<><HistoryOutlined /> Мои заявки</>}
              style={{ borderRadius: '12px' }}
            >
              <Table 
                dataSource={requests} 
                columns={columns} 
                rowKey="id" 
                pagination={{ pageSize: 5 }}
                size="middle"
              />
            </Card>
          </Col>
        </Row>

        <GatekeeperModal 
          visible={gkVisible}
          hardBlock={grace_period_left === 0}
          userData={user as any}
          onClose={() => setGkVisible(false)}
        />
      </Content>
    </Layout>
  );
};

export default ProfilePage;
