import React from 'react';
import { Form, Input, Button, Descriptions, Typography } from 'antd';
import { PhoneOutlined, HomeOutlined, SaveOutlined } from '@ant-design/icons';
import type { UserProfile } from '../../api/users';

const { Text } = Typography;

interface ProfileFormProps {
  user: UserProfile;
  submitting: boolean;
  adSyncUnavailable: boolean;
  onFinish: (values: { internal_phone: string; mobile_phone: string; office_location: string }) => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ user, submitting, adSyncUnavailable, onFinish }) => {
  return (
    <>
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
    </>
  );
};

export default ProfileForm;
