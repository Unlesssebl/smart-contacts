import React, { useState, useEffect } from 'react';
import { Row, Col, Card, message, Alert } from 'antd';
import { UserOutlined, HistoryOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { getMe } from '../../api/auth';
import type { UserProfile } from '../../api/users';
import { getMyRequests, createChangeRequest } from '../../api/changeRequests';
import type { ChangeRequest } from '../../api/changeRequests';
import GatekeeperModal from '../../components/GatekeeperModal/GatekeeperModal';
import ChangeRequestTable from '../../components/ChangeRequestTable/ChangeRequestTable';
import ProfileForm from '../../components/ProfileForm/ProfileForm';

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [gkVisible, setGkVisible] = useState(false);
  
  const { is_verified, grace_period_left, adSyncUnavailable } = useAuthStore();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userData, requestsData] = await Promise.all([
          getMe(),
          getMyRequests()
        ]);
        setUser(userData);
        setRequests(requestsData);
        
        if (!userData.is_verified) {
          setGkVisible(true);
        }
      } catch {
        message.error('Ошибка загрузки данных');
      }
    };

    fetchData();
  }, []);

  const onFinish = async (values: { internal_phone: string; mobile_phone: string; office_location: string }) => {
    if (!user) return;
    setSubmitting(true);
    try {
      const changes = [];
      if (values.internal_phone !== user.internal_phone) {
        changes.push({ attribute_name: 'internal_phone', new_value: values.internal_phone });
      }
      if (values.mobile_phone !== user.mobile_phone) {
        const cleanMobile = values.mobile_phone.replace(/\D/g, '').replace(/^8/, '7');
        const formattedMobile = cleanMobile.startsWith('7') ? `+${cleanMobile}` : `+7${cleanMobile}`;
        changes.push({ attribute_name: 'mobile_phone', new_value: formattedMobile });
      }
      if (values.office_location !== user.office_location) {
        changes.push({ attribute_name: 'office_location', new_value: values.office_location });
      }

      if (changes.length === 0) {
        message.info('Нет изменений для сохранения');
        return;
      }

      await Promise.all(changes.map(c => createChangeRequest(c)));
      
      message.success('Заявки на изменение данных отправлены');
      
      // Re-fetch data
      const [userData, requestsData] = await Promise.all([
        getMe(),
        getMyRequests()
      ]);
      setUser(userData);
      setRequests(requestsData);
      
      if (!is_verified) {
        useAuthStore.getState().updateVerification(true);
        setGkVisible(false);
      }
    } catch {
      message.error('Ошибка при отправке заявки');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div style={{ padding: '40px 24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
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
          <Col xs={24} lg={10}>
            <Card 
              className="glass-card" 
              title={<><UserOutlined /> Данные профиля</>}
              style={{ borderRadius: '12px' }}
            >
              <ProfileForm 
                user={user} 
                submitting={submitting} 
                adSyncUnavailable={adSyncUnavailable} 
                onFinish={onFinish} 
              />
            </Card>
          </Col>

          <Col xs={24} lg={14}>
            <Card 
              className="glass-card" 
              title={<><HistoryOutlined /> Мои заявки</>}
              style={{ borderRadius: '12px' }}
            >
              <ChangeRequestTable requests={requests} />
            </Card>
          </Col>
        </Row>

        <GatekeeperModal 
          visible={gkVisible}
          hardBlock={grace_period_left === 0}
          userData={user}
          onClose={() => setGkVisible(false)}
        />
    </div>
  );
};

export default ProfilePage;
