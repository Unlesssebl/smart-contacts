import React from 'react';
import { Table, Tag, Button } from 'antd';
import type { Report } from '../../api/reports';

interface ReportsManagerProps {
  reports: Report[];
  loading: boolean;
  onProcess: (id: string) => void;
}

const ReportsManager: React.FC<ReportsManagerProps> = ({ reports, loading, onProcess }) => {
  const reportColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
    },
    {
      title: 'Описание ошибки',
      dataIndex: 'reason',
      key: 'reason',
    },
    {
      title: 'Дата',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (d: string) => new Date(d).toLocaleString()
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'pending' ? 'gold' : 'green'}>
          {status === 'pending' ? 'Ожидает' : 'Обработано'}
        </Tag>
      )
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: unknown, record: Report) => (
        record.status === 'pending' ? (
          <Button 
            size="small" 
            onClick={() => onProcess(record.id)}
          >
            Обработано
          </Button>
        ) : null
      )
    }
  ];

  return (
    <Table 
      dataSource={reports} 
      columns={reportColumns} 
      rowKey="id" 
      loading={loading}
      pagination={{ pageSize: 10 }}
    />
  );
};

export default ReportsManager;
