import { Outlet } from "react-router-dom";
import { Header } from "../components/Header.js";
import { Sidebar, type SidebarItem } from "../components/Sidebar.js";
import { Footer } from "../components/Footer.js";
import "./Layout.css";

const NAV_ITEMS: SidebarItem[] = [{ label: "Home", to: "/" }];

export function Layout() {
  return (
    <div className="titan-layout">
      <a href="#main-content" className="titan-skip-link">
        Skip to main content
      </a>
      <Header />
      <div className="titan-layout__body">
        <Sidebar items={NAV_ITEMS} />
        <div className="titan-layout__content">
          <Outlet />
        </div>
      </div>
      <Footer />
    </div>
  );
}
