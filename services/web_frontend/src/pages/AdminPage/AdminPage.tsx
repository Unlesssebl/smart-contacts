import React, { useState, useEffect } from 'react';
import { 
  Layout, Card, Typography, Table, Tag, Button, 
  Tabs, Space, message, Badge 
} from 'antd';
import { 
  CheckOutlined, CloseOutlined, ToolOutlined, 
  AuditOutlined, MessageOutlined 
} from '@ant-design/icons';
import { getAllRequests, processRequest } from '../../api/changeRequests';
import type { ChangeRequest } from '../../api/changeRequests';
import { getAllReports, processReport } from '../../api/reports';
import type { Report } from '../../api/reports';

const { Content } = Layout;
const { Title, Text } = Typography;

const AdminPage: React.FC = () => {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqData, repData] = await Promise.all([
        getAllRequests(),
        getAllReports()
      ]);
      setRequests(reqData);
      setReports(repData);
    } catch (e) {
      message.error('Ошибка доступа к данным администрирования');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProcessRequest = async (id: string, action: 'approve' | 'reject') => {
    try {
      await processRequest(id, action);
      message.success(`Заявка ${action === 'approve' ? 'одобрена' : 'отклонена'}`);
      fetchData();
    } catch (e) {
      message.error('Ошибка при обработке заявки');
    }
  };

  const handleProcessReport = async (id: string) => {
    try {
      await processReport(id);
      message.success('Репорт помечен как обработанный');
      fetchData();
    } catch (e) {
      message.error('Ошибка при обработке репорта');
    }
  };

  const requestColumns = [
    {
      title: 'Пользователь ID',
      dataIndex: 'user_id',
      key: 'user_id',
    },
    {
      title: 'Поле',
      dataIndex: 'field_name',
      key: 'field_name',
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
        const colors: any = { pending: 'processing', approved: 'success', rejected: 'error', conflict: 'warning' };
        return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: ChangeRequest) => (
        record.status === 'pending' || record.status === 'conflict' ? (
          <Space>
            <Button 
              type="primary" 
              size="small" 
              icon={<CheckOutlined />} 
              onClick={() => handleProcessRequest(record.id, 'approve')}
            >
              Одобрить
            </Button>
            <Button 
              danger 
              size="small" 
              icon={<CloseOutlined />} 
              onClick={() => handleProcessRequest(record.id, 'reject')}
            >
              Отклонить
            </Button>
          </Space>
        ) : null
      )
    }
  ];

  const reportColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
    },
    {
      title: 'Описание ошибки',
      dataIndex: 'description',
      key: 'description',
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
      render: (_: any, record: Report) => (
        record.status === 'pending' ? (
          <Button 
            size="small" 
            onClick={() => handleProcessReport(record.id)}
          >
            Обработано
          </Button>
        ) : null
      )
    }
  ];

  const items = [
    {
      key: 'requests',
      label: (
        <span>
          <AuditOutlined /> Заявки
          <Badge count={requests.filter(r => r.status === 'pending').length} style={{ marginLeft: 8 }} />
        </span>
      ),
      children: (
        <Table 
          dataSource={requests} 
          columns={requestColumns} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      ),
    },
    {
      key: 'reports',
      label: (
        <span>
          <MessageOutlined /> Репорты
          <Badge count={reports.filter(r => r.status === 'pending').length} style={{ marginLeft: 8 }} />
        </span>
      ),
      children: (
        <Table 
          dataSource={reports} 
          columns={reportColumns} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Content style={{ padding: '40px 24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '32px' }}>
          <Title level={1}><ToolOutlined /> Пульт ИТ-оператора</Title>
        </div>

        <Card className="glass-card" style={{ borderRadius: '12px' }}>
          <Tabs defaultActiveKey="requests" items={items} />
        </Card>
      </Content>
    </Layout>
  );
};

export default AdminPage;
