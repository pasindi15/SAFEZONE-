import React from "react";
import { Outlet } from "react-router-dom";
import DonationSidebar from "./DonationSidebar";
import "./donationcss/DashboardLayout.css";
import Nav from '../../Components/NavBar/adminNav';
export default function DashboardLayout() {
  return (
    <>
      <Nav />
      <div className="donation-dashboard-component">
        <div className="dd-dashboard-layout">
          <DonationSidebar />
          <div className="dd-main-content">
            <main className="dd-content-body">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </>
  );
}

// export default function DashboardLayout() {
//   return (
//     <div className="dashboard-layout">
//       <DonationSidebar />
//       <main className="dashboard-main">
//         <Outlet />
//       </main>
//     </div>
//   );
// }
