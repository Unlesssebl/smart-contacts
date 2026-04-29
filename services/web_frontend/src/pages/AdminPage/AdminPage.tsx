import React, { useState, useEffect } from 'react';
import { Layout, Card, Typography, Tabs, message, Badge } from 'antd';
import { ToolOutlined, AuditOutlined, MessageOutlined } from '@ant-design/icons';
import { getAllRequests, processRequest } from '../../api/changeRequests';
import type { ChangeRequest } from '../../api/changeRequests';
import { getAllReports, processReport } from '../../api/reports';
import type { Report } from '../../api/reports';
import RequestsManager from './RequestsManager';
import ReportsManager from './ReportsManager';

const { Content } = Layout;
const { Title } = Typography;

const AdminPage: React.FC = () => {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [reqData, repData] = await Promise.all([
        getAllRequests(),
        getAllReports()
      ]);
      setRequests(reqData);
      setReports(repData);
    } catch {
      message.error('Ошибка доступа к данным администрирования');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleProcessRequest = async (id: string, action: 'approve' | 'reject') => {
    try {
      await processRequest(id, action);
      message.success(`Заявка ${action === 'approve' ? 'одобрена' : 'отклонена'}`);
      fetchData();
    } catch {
      message.error('Ошибка при обработке заявки');
    }
  };

  const handleProcessReport = async (id: string) => {
    try {
      await processReport(id);
      message.success('Репорт помечен как обработанный');
      fetchData();
    } catch {
      message.error('Ошибка при обработке репорта');
    }
  };

  const tabItems = [
    {
      key: 'requests',
      label: (
        <span>
          <AuditOutlined /> Заявки
          <Badge count={requests.filter(r => r.status === 'pending').length} style={{ marginLeft: 8 }} />
        </span>
      ),
      children: (
        <RequestsManager 
          requests={requests} 
          loading={loading} 
          onProcess={handleProcessRequest} 
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
        <ReportsManager 
          reports={reports} 
          loading={loading} 
          onProcess={handleProcessReport} 
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
          <Tabs defaultActiveKey="requests" items={tabItems} />
        </Card>
      </Content>
    </Layout>
  );
};

export default AdminPage;
