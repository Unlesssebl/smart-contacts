import React from 'react';
import { Table, Tag } from 'antd';
import type { ChangeRequest } from '../../api/changeRequests';

interface ChangeRequestTableProps {
  requests: ChangeRequest[];
}

const ChangeRequestTable: React.FC<ChangeRequestTableProps> = ({ requests }) => {
  const columns = [
    {
      title: 'Поле',
      dataIndex: 'attribute_name',
      key: 'attribute_name',
      render: (text: string) => {
        const labels: Record<string, string> = {
          internal_phone: 'Внутренний тел.',
          mobile_phone: 'Мобильный тел.',
          office_location: 'Кабинет',
          full_name: 'ФИО',
          department: 'Отдел'
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
        const colors: Record<string, string> = {
          pending: 'processing',
          approved: 'success',
          rejected: 'error',
          conflict: 'warning'
        };
        const labels: Record<string, string> = {
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

  return (
    <Table 
      dataSource={requests} 
      columns={columns} 
      rowKey="id" 
      pagination={{ pageSize: 5 }}
      size="middle"
    />
  );
};

export default ChangeRequestTable;
