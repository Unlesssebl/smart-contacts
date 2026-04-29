import React from 'react';
import { Table, Tag, Button, Space, Typography } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import type { ChangeRequest } from '../../api/changeRequests';

const { Text } = Typography;

interface RequestsManagerProps {
  requests: ChangeRequest[];
  loading: boolean;
  onProcess: (id: string, action: 'approve' | 'reject') => void;
}

const RequestsManager: React.FC<RequestsManagerProps> = ({ requests, loading, onProcess }) => {
  const requestColumns = [
    {
      title: 'Пользователь ID',
      dataIndex: 'user_guid',
      key: 'user_guid',
    },
    {
      title: 'Поле',
      dataIndex: 'attribute_name',
      key: 'attribute_name',
    },
    {
      title: 'Старое значение',
      dataIndex: 'old_value',
      key: 'old_value',
      render: (v: string) => v || <Text type="secondary">-</Text>
    },
    {
      title: 'Новое значение',
      dataIndex: 'new_value',
      key: 'new_value',
      render: (v: string) => <Text strong>{v}</Text>
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = { pending: 'processing', approved: 'success', rejected: 'error', conflict: 'warning' };
        return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: unknown, record: ChangeRequest) => (
        record.status === 'pending' || record.status === 'conflict' ? (
          <Space>
            <Button 
              type="primary" 
              size="small" 
              icon={<CheckOutlined />} 
              onClick={() => onProcess(record.id, 'approve')}
            >
              Одобрить
            </Button>
            <Button 
              danger 
              size="small" 
              icon={<CloseOutlined />} 
              onClick={() => onProcess(record.id, 'reject')}
            >
              Отклонить
            </Button>
          </Space>
        ) : null
      )
    }
  ];

  return (
    <Table 
      dataSource={requests} 
      columns={requestColumns} 
      rowKey="id" 
      loading={loading}
      pagination={{ pageSize: 10 }}
    />
  );
};

export default RequestsManager;
