import React, { useState, useEffect } from 'react';
import { Input, Select, Row, Col, Skeleton, Empty, Button, Typography } from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';
import UserCard from '../../components/UserCard/UserCard';
import { searchUsers, getDepartments } from '../../api/users';
import type { UserProfile } from '../../api/users';

const { Title } = Typography;
const { Option } = Select;

const DirectoryPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [filters, setFilters] = useState({ query: '', department: undefined });

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const data = await getDepartments();
        setDepartments(data);
      } catch (e) {
        console.error('Failed to fetch departments');
      }
    };
    fetchDepts();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const data = await searchUsers(filters);
        setUsers(data.items || []);
      } catch (e) {
        console.error('Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);

    return () => clearTimeout(timer);
  }, [filters]);

  const handleReset = () => {
    setFilters({ query: '', department: undefined });
  };

  return (
    <div style={{ padding: '40px 24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <Title level={1}>Справочник сотрудников</Title>
        <div style={{ maxWidth: '600px', margin: '24px auto', display: 'flex', gap: '12px' }}>
          <Input
            placeholder="Поиск по имени или телефону..."
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            size="large"
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            style={{ borderRadius: '12px' }}
          />
          <Select
            placeholder="Отдел"
            size="large"
            allowClear
            style={{ width: '200px' }}
            value={filters.department}
            onChange={(val) => setFilters({ ...filters, department: val })}
            suffixIcon={<FilterOutlined />}
            dropdownStyle={{ borderRadius: '8px' }}
          >
            {departments.map((d) => (
              <Option key={d} value={d}>{d}</Option>
            ))}
          </Select>
        </div>
      </div>

      {loading ? (
        <Row gutter={[24, 24]}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Col xs={24} sm={12} lg={8} key={i}>
              <Skeleton active avatar paragraph={{ rows: 2 }} className="glass-card" style={{ padding: '20px' }} />
            </Col>
          ))}
        </Row>
      ) : users.length > 0 ? (
        <Row gutter={[24, 24]}>
          {users.map((user) => (
            <Col xs={24} sm={12} lg={8} key={user.id}>
              <UserCard user={user} />
            </Col>
          ))}
        </Row>
      ) : (
        <Empty
          description="Ничего не найдено"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ marginTop: '64px' }}
        >
          <Button type="primary" onClick={handleReset}>Сбросить фильтры</Button>
        </Empty>
      )}
    </div>
  );
};

export default DirectoryPage;
