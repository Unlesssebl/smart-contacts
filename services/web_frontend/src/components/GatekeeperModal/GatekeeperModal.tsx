import React, { useState } from 'react';
import { Modal, Button, Typography, Space, Card, Descriptions, Tag, message } from 'antd';
import { CheckCircleOutlined, EditOutlined, ArrowRightOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { acknowledgeGatekeeper } from '../../api/changeRequests';
import type { UserProfile } from '../../api/users';

const { Title, Paragraph } = Typography;

interface GatekeeperModalProps {
  hardBlock: boolean;
  userData: UserProfile;
  visible: boolean;
  onClose: () => void;
}

const GatekeeperModal: React.FC<GatekeeperModalProps> = ({ hardBlock, userData, visible, onClose }) => {
  const [loading, setLoading] = useState(false);
  const { grace_period_left, updateVerification, decrementGracePeriod } = useAuthStore();

  const handleAction = async (action: 'confirm' | 'skip') => {
    setLoading(true);
    try {
      await acknowledgeGatekeeper(action);
      if (action === 'confirm') {
        updateVerification(true);
        message.success('Данные подтверждены');
      } else {
        decrementGracePeriod();
        message.info('Проверка отложена');
      }
      onClose();
    } catch (error) {
      message.error('Ошибка при сохранении решения');
    } finally {
      setLoading(false);
    }
  };

  const getCounterColor = () => {
    if (grace_period_left === 1) return 'error';
    if (grace_period_left === 2) return 'warning';
    return 'default';
  };

  return (
    <Modal
      open={visible}
      footer={null}
      closable={!hardBlock}
      maskClosable={!hardBlock}
      centered
      width={600}
      className="glass-card"
      onCancel={!hardBlock ? onClose : undefined}
    >
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <Title level={3}>Проверьте актуальность ваших данных</Title>
        {!hardBlock && (
          <Tag color={getCounterColor()} style={{ fontSize: '14px', padding: '4px 12px' }}>
            <InfoCircleOutlined /> Осталось пропусков: {grace_period_left} из 3
          </Tag>
        )}
        {grace_period_left === 1 && !hardBlock && (
          <Paragraph type="danger" style={{ marginTop: '8px' }}>
            Это ваша последняя возможность пропустить подтверждение данных.
          </Paragraph>
        )}
      </div>

      <Card size="small" bordered={false} style={{ background: 'rgba(0,0,0,0.02)', borderRadius: '12px' }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="ФИО">{userData.full_name}</Descriptions.Item>
          <Descriptions.Item label="Должность">{userData.job_title}</Descriptions.Item>
          <Descriptions.Item label="Отдел">{userData.department}</Descriptions.Item>
          <Descriptions.Item label="Кабинет">{userData.office_location || 'Не указан'}</Descriptions.Item>
          <Descriptions.Item label="Внутренний телефон">{userData.internal_phone || 'Не указан'}</Descriptions.Item>
          <Descriptions.Item label="Мобильный телефон">{userData.mobile_phone || 'Не указан'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Space direction="vertical" style={{ width: '100%', marginTop: '24px' }} size="middle">
        <Button 
          type="primary" 
          icon={<CheckCircleOutlined />} 
          block 
          size="large"
          loading={loading}
          onClick={() => handleAction('confirm')}
        >
          Всё верно
        </Button>
        <Button 
          icon={<EditOutlined />} 
          block 
          size="large"
          disabled={loading}
          onClick={() => {
            onClose();
            // In a real app, you'd navigate or scroll to the form
          }}
        >
          Изменить данные
        </Button>
        {!hardBlock && (
          <Button 
            type="text" 
            danger={grace_period_left === 1}
            icon={<ArrowRightOutlined />} 
            block 
            disabled={loading}
            onClick={() => handleAction('skip')}
            title={grace_period_left === 1 ? "Это последняя возможность пропустить" : ""}
          >
            Пропустить
          </Button>
        )}
      </Space>
    </Modal>
  );
};

export default GatekeeperModal;
