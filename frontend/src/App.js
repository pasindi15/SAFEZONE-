// src/App.js
import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import "./App.css";

/* ----------- Shared layout ----------- */
import Header from "./HeaderFotter/Header";
import Footer from "./HeaderFotter/Footer";

/* ----------- User-facing (root home) ----------- */
import MainHome from "./Components/Home/home";

/* ----------- Admin pages ----------- */
import AdminHome from "./Components/Admins/AdminHome";
import AdminAlert from "./Components/AlertFolder/AdminAlert";
import AlertAdd from "./Components/AlertFolder/AlertAdd";
import UpdateAlert from "./Components/AlertFolder/UpdateAlert";
import AdminRegitration from "./Components/Admins/AdminRegitration";
import AdminLogin from "./Components/Admins/AdminLogin";
import AdminProfile from "./Components/Admins/AdminProfile";

/* ----------- Reports ----------- */
import ReportGenerator from "./Components/Reports/ReportGenarator";

/* ----------- User features ----------- */
import UserAlerts from "./Components/UserAlertFolder/UserAlerts";
import Registration from "./Components/UserRegFolder/Registation";
import UserLogin from "./Components/UserLoginFolder/UserLogin";
import EmailVerify from "./Components/EmailVerify/Everify";
import UserProfile from "./Components/UserRegFolder/UserProfile";

/* ----------- Map / Contact / Simple dashboard ----------- */
import MapComponent from "./Components/map/map";
import UserMap from "./Components/map/UserMap";
import PinDetails from "./Components/map/PinDetails";
import ContactForm from "./Components/Conatct/ContactForm";
import ContactList from "./Components/Conatct/ContactList";
import SimpleDashboard from "./Components/Dashboard/SimpleDashboard";

/* ----------- Victim Dashboard ----------- */
import Dashboard from "./Component/VictimDashboard/Dashboard";
import Report from "./Component/VictimDashboard/ReportDisaster/Report";
import ReadReport from "./Component/VictimDashboard/ReportDisaster/ReadReport";
import EditReport from "./Component/VictimDashboard/ReportDisaster/EditReport";
import VictimProfile from "./Component/VictimDashboard/VictimProfile/VictimProfile";
import EditVictimProfile from "./Component/VictimDashboard/VictimProfile/EditVictimProfile";
import RequestAid from "./Component/VictimDashboard/RequestAid/RequestAid";
import ReadAid from "./Component/VictimDashboard/RequestAid/Read";
import Claim from "./Component/VictimDashboard/DisasterClaim/Claim";
import ReadClaim from "./Component/VictimDashboard/DisasterClaim/Read";
import TakeAction from "./Component/VictimDashboard/DisasterClaim/TakeAction";
import ReportsHub from "./Component/VictimDashboard/ReportsHub/ReportsHub";
import Records from "./Component/VictimDashboard/Records/Records";
import DMODashboard from "./Components/DMODashboard/DMODashboard";
import ResponseDashboard from "./Components/ResponseDashboard/ResponseDashboard";
import Deployments from "./Components/DMODashboard/Reports/Deployments";

/* ----------- Donation Dashboard ----------- */
import DashboardLayout from "./Component/DonationDashboard/DashboardLayout";
import Overview from "./Component/DonationDashboard/Overview";
import DonationsPanel from "./Component/DonationDashboard/DonationsPanel";
import ActiveDisasterPanel from "./Component/DonationDashboard/active";
import InventoryPanel from "./Component/DonationDashboard/InventoryPanel";
import CentersPanel from "./Component/DonationDashboard/CentersPanel";
import VolunteersPanel from "./Component/DonationDashboard/VolunteersPanel";
import DistributionPanel from "./Component/DonationDashboard/DistributionPanel";
import TopDonorsPage from "./Component/DonationDashboard/TopDonorsPage";
import Operation from "./Component/DonationDashboard/Operation";
import EditVolunteerPage from "./Component/DonationDashboard/EditVolunteerPage";
import DonationEditPage from "./Component/DonationDashboard/DonationEditPage";
import EditCenter from "./Component/DonationDashboard/EditCenter";
import DistributionQuantityChart from './Component/DonationDashboard/distributionquantitychart';
import TargetInventory from "./Component/DonationDashboard/targetinventory";
import Ngopast from "./Component/DonationDashboard/ngopast";

/* ----------- Public Donation Pages ----------- */
import Donation from "./Component/Donation/Donationwebpage/Donation";
import DistributionPlan from "./Component/Donation/Donate_distributionplan/Distributionplan";
import Donationform from "./Component/Donation/Donatemoney/Donationform";
import Ngodisaster from "./Component/Donation/Donate_activedisasters/Ngodisaster";
import Centers from "./Component/Donation/donate_centers/centers";
import Volunteer from "./Component/Donation/Donation_volunteer/Volunteer";
import DonateItemForm from "./Component/Donation/Donaterelief/donateitemform";


// Public layout with Header and Footer
function PublicLayout() {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
    </>
  );
}

// Admin area without global Header/Footer (you can add a dedicated AdminHeader later)
function AdminLayout() {
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      {/* Public site layout (shows Header + Footer) */}
      <Route element={<PublicLayout />}>
        {/* Root home */}
        <Route path="/" element={<MainHome />} />
        {/* Old /Home links → redirect to root */}
        <Route path="/Home" element={<Navigate to="/" replace />} />

        {/* User routes */}
        <Route path="/UserAlerts" element={<UserAlerts />} />
        <Route path="/Registration" element={<Registration />} />
        <Route path="/UserLogin" element={<UserLogin />} />
        <Route path="/users/:id/verify/:token" element={<EmailVerify />} />
        <Route path="/UserProfile" element={<UserProfile />} />

        {/* Map / Contact */}
        <Route path="/map" element={<MapComponent />} />
        <Route path="/user-map" element={<UserMap />} />
        <Route path="/pin-details/:id" element={<PinDetails />} />
        <Route path="/pin/:id" element={<PinDetails />} />
        <Route path="/contact" element={<ContactForm />} />
        <Route path="/contact-list" element={<ContactList />} />

        {/* Victim Dashboard - only basic routes stay in public */}
        <Route path="/victim" element={<Dashboard />} />
        <Route path="/victim/dashboard" element={<Dashboard />} />
        <Route path="/victim/report" element={<Report />} />
        <Route path="/victim/report/:id/edit" element={<EditReport />} />
        <Route path="/victim/profile/:id" element={<VictimProfile />} />
        <Route path="/victim/profile/:id/edit" element={<EditVictimProfile />} />
        <Route path="/victim/aid" element={<RequestAid />} />
        <Route path="/victim/claim" element={<Claim />} />

        {/* Public reports page */}
        <Route path="/reports" element={<ReportGenerator />} />

        {/* Donation Pages */}
        <Route path="/donation" element={<Donation />} />
        <Route path="/donation/new" element={<Donationform />} />
        <Route path="/donation/distribution-plan" element={<DistributionPlan />} />
        <Route path="/donation/donate-money" element={<Donationform />} />
        <Route path="/donation/active-disasters" element={<Ngodisaster />} />
        <Route path="/donation/centers" element={<Centers />} />
        <Route path="/donation/volunteer" element={<Volunteer />} />
        <Route path="/donation/donate-items" element={<DonateItemForm />} />
      </Route>

      {/* Admin layout (NO Header/Footer) */}
      <Route element={<AdminLayout />}>
        {/* Admin auth */}
        <Route path="/AdminLogin" element={<AdminLogin />} />
        
        {/* Victim Admin Pages - moved to admin layout to show admin header only */}
        <Route path="/victim/reports" element={<ReportsHub />} />
        <Route path="/victim/records" element={<Records />} />
        <Route path="/victim/read" element={<ReadReport />} />
        <Route path="/victim/aid/records" element={<ReadAid />} />
        <Route path="/victim/claim/records" element={<ReadClaim />} />
        <Route path="/victim/claim/action/:id" element={<TakeAction />} />
        
        {/* Simple Dashboard - moved from PublicLayout to remove duplicate header */}
        <Route path="/admin-dashboard" element={<SimpleDashboard />} />
        
        {/* DMO Dashboard - moved from PublicLayout to remove duplicate header */}
        <Route path="/dmo" element={<DMODashboard />} />
        <Route path="/deployments" element={<Deployments />} />
        
        {/* Response Team Dashboard - moved from PublicLayout to remove duplicate header */}
        <Route path="/response" element={<ResponseDashboard />} />
        
        {/* Donation Dashboard - moved from PublicLayout to remove duplicate header */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Overview />} />
          <Route path="overview" element={<Overview />} />
          <Route path="donations" element={<DonationsPanel />} />
          <Route path="disasters/active" element={<ActiveDisasterPanel />} />
          <Route path="inventory" element={<InventoryPanel />} />
          <Route path="centers" element={<CentersPanel />} />
          <Route path="volunteers" element={<VolunteersPanel />} />
          <Route path="distribution" element={<DistributionPanel />} />
          <Route path="ngopast" element={<Ngopast />} />
          <Route path="top-donors" element={<TopDonorsPage />} />
          <Route path="operation" element={<Operation />} />
          <Route path="target-inventory" element={<TargetInventory />} />
          <Route path="distribution-quantity-chart" element={<DistributionQuantityChart />} />
          <Route path="volunteers/:id/edit" element={<EditVolunteerPage />} />
          <Route path="donations/:id/edit" element={<DonationEditPage />} />
          <Route path="centers/:id/edit" element={<EditCenter />} />
        </Route>
        
        {/* Admin dashboard (nested) */}
        <Route path="/AdminHome" element={<AdminHome />}>
          <Route index element={<AdminAlert />} />
          <Route path="toAlerts" element={<AdminAlert />} />
          <Route path="alerts/:severity" element={<AdminAlert />} />
          <Route path="AlertAdd" element={<AlertAdd />} />
          <Route path="UpdateAlert/:id" element={<UpdateAlert />} />
          <Route path="AdminRegitration" element={<AdminRegitration />} />
          <Route path="AdminProfile" element={<AdminProfile />} />
          <Route path="ReportGenerator" element={<ReportGenerator />} />
        </Route>
      </Route>

      {/* Fallback → root */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}