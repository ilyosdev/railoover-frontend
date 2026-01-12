import {
    BarChartOutlined,
    ClusterOutlined,
    CodeOutlined,
    ControlOutlined,
    DashboardOutlined,
    LaptopOutlined,
    LogoutOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    ProjectOutlined,
    SettingOutlined,
    TeamOutlined,
} from '@ant-design/icons'
import { Button, Layout, Menu, MenuProps } from 'antd'
import React, { useContext } from 'react'
import CapRoverThemeContext from '../contexts/CapRoverThemeContext'
import ThemeParser from '../styles/theme/ThemeParser'
import { localize } from '../utils/Language'
import '../styles/dashboard-sidebar.css'

const { Sider } = Layout

interface SidebarProps {
    isMobile: boolean
    collapsed: boolean
    toggleSider: () => void
    onLogoutClicked: () => void
    location: any
    history: any
}

const Sidebar: React.FC<SidebarProps> = ({
    isMobile,
    collapsed,
    toggleSider,
    onLogoutClicked,
    location,
    history,
}) => {
    const { currentTheme } = useContext(CapRoverThemeContext)

    let siderTheme = (ThemeParser.parseExtra(currentTheme)?.siderTheme ||
        'light') as 'light' | 'dark'

    const MENU_ITEMS: MenuProps['items'] = [
        {
            key: 'dashboard',
            label: localize('menu_item.dashboard', 'Dashboard'),
            icon: <LaptopOutlined />,
        },
        {
            key: 'projects',
            label: localize('menu_item.projects', 'Projects'),
            icon: <ProjectOutlined />,
        },
        {
            key: 'apps',
            label: localize('menu_item.app', 'Apps'),
            icon: <CodeOutlined />,
        },
        {
            key: 'monitoring',
            label: localize('menu_item.monitoring', 'Monitoring'),
            icon: <DashboardOutlined />,
        },
        {
            key: 'cluster',
            label: localize('menu_item.cluster', 'Cluster'),
            icon: <ClusterOutlined />,
        },
        {
            key: 'maintenance',
            label: localize('menu_item.maintenance', 'Maintenance'),
            icon: <ControlOutlined />,
        },
        {
            key: 'settings',
            label: localize('menu_item.settings', 'Settings'),
            icon: <SettingOutlined />,
        },
        {
            key: 'team',
            label: localize('menu_item.team', 'Team'),
            icon: <TeamOutlined />,
        },
        { type: 'divider' },
        {
            key: 'logout',
            label: localize('page_root.logout', 'Logout'),
            icon: <LogoutOutlined />,
            danger: true,
        },
    ] as MenuProps['items']

    const LOGOUT = 'logout'

    return (
        <>
            {isMobile && collapsed && (
                <Button
                    type="primary"
                    icon={<MenuUnfoldOutlined />}
                    onClick={toggleSider}
                    style={{
                        position: 'fixed',
                        top: 16,
                        left: 16,
                        zIndex: 1000,
                    }}
                />
            )}
            <Sider
                breakpoint="lg"
                theme={siderTheme}
                trigger={isMobile && undefined}
                collapsible
                collapsed={collapsed}
                width={200}
                collapsedWidth={isMobile ? 0 : 80}
                style={{ zIndex: 2 }}
                onCollapse={toggleSider}
            >
                <div className="sidebar-logo-container">
                    {isMobile && !collapsed && (
                        <Button
                            type="text"
                            icon={<MenuFoldOutlined />}
                            onClick={toggleSider}
                            style={{ marginRight: 8 }}
                        />
                    )}
                    <img
                        src="/icon-512x512.png"
                        alt="Railover"
                        className="sidebar-logo-image"
                    />
                    {!collapsed && (
                        <span className="sidebar-logo-text">Railover</span>
                    )}
                </div>
                <Menu
                    selectedKeys={[location.pathname.substring(1)]}
                    theme={siderTheme}
                    mode="inline"
                    defaultSelectedKeys={['dashboard']}
                    style={{ height: 'calc(100% - 64px)', borderRight: 0 }}
                    items={MENU_ITEMS}
                    onClick={(e) => {
                        if (e.key === LOGOUT) {
                            onLogoutClicked()
                        } else {
                            history.push(`/${e.key}`)
                        }
                    }}
                ></Menu>
            </Sider>
        </>
    )
}

export default Sidebar
