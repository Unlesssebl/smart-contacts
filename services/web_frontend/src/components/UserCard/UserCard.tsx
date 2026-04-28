import React from 'react';
import { Card, Avatar, Typography, Space, Tag, Tooltip } from 'antd';
import { PhoneOutlined, EnvironmentOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { UserProfile } from '../../api/users';

const { Text, Title } = Typography;

interface UserCardProps {
  user: UserProfile;
  onClick?: () => void;
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getDeptColor = (dept: string) => {
  const hash = dept.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 50%)`;
};

const UserCard: React.FC<UserCardProps> = ({ user, onClick }) => {
  const initials = getInitials(user.full_name);
  const avatarColor = getDeptColor(user.department);

  return (
    <Card 
      hoverable 
      className="glass-card" 
      onClick={onClick}
      style={{ height: '100%', borderRadius: '12px' }}
      bodyStyle={{ padding: '20px' }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Avatar 
            size={64} 
            style={{ 
              backgroundColor: avatarColor, 
              fontSize: '24px',
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            {initials}
          </Avatar>
          <div style={{ overflow: 'hidden' }}>
            <Title level={5} style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.full_name}
              {user.status === 'ON_LEAVE' && (
                <Tooltip title="В отпуске / Отключен временно">
                  <ClockCircleOutlined style={{ marginLeft: '8px', color: '#faad14' }} />
                </Tooltip>
              )}
            </Title>
            <Text type="secondary" style={{ fontSize: '12px' }}>{user.job_title}</Text>
          </div>
        </div>

        <Tag color="blue" style={{ borderRadius: '4px' }}>{user.department}</Tag>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Space size="small">
            <EnvironmentOutlined style={{ color: '#8c8c8c' }} />
            <Text style={{ fontSize: '12px' }}>{user.office_location || <Text type="secondary">Не указан</Text>}</Text>
          </Space>
          <Space size="small">
            <PhoneOutlined style={{ color: '#8c8c8c' }} />
            <Text style={{ fontSize: '12px' }}>{user.internal_phone || <Text type="secondary">Не указан</Text>}</Text>
          </Space>
        </div>
      </Space>
    </Card>
  );
};

export default UserCard;
