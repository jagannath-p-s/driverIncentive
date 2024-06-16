import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { motion, AnimatePresence } from "framer-motion";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaPlus, FaSearch, FaSignOutAlt, FaTrashAlt, FaClipboardCheck, FaTimes, FaCheck, FaBan } from "react-icons/fa";

const Home = ({ user }) => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDelivery, setNewDelivery] = useState({
    id: "",
    name: "",
    total_collected: "",
  });
  const [search, setSearch] = useState("");
  const [showConfirmClaimModal, setShowConfirmClaimModal] = useState(false);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [newDriverName, setNewDriverName] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState(null);

  const alertConfigs = {
    delete: {
      color: "bg-red-500",
      icon: <FaTimes className="text-white" />,
      message: "Driver deleted successfully!",
    },
    submit: {
      color: "bg-green-500",
      icon: <FaCheck className="text-white" />,
      message: "Delivery details added successfully!",
    },
    claim: {
      color: "bg-yellow-500",
      icon: <FaClipboardCheck className="text-white" />,
      message: "Points claimed successfully!",
    },
    add: {
      color: "bg-green-500",
      icon: <FaPlus className="text-white" />,
      message: "Driver added successfully!",
    },
    error: {
      color: "bg-red-500",
      icon: <FaBan className="text-white" />,
      message: "An error occurred!",
    },
  };

  useEffect(() => {
    fetchDrivers();
    const subscription = supabase
      .channel("public:drivers")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drivers" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setDrivers((prevDrivers) => [...prevDrivers, payload.new]);
          } else if (payload.eventType === "UPDATE") {
            setDrivers((prevDrivers) =>
              prevDrivers.map((driver) =>
                driver.driver_id === payload.new.driver_id
                  ? payload.new
                  : driver
              )
            );
          } else if (payload.eventType === "DELETE") {
            setDrivers((prevDrivers) =>
              prevDrivers.filter(
                (driver) => driver.driver_id !== payload.old.driver_id
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchDrivers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .order("driver_id", { ascending: true });

    if (error) {
      console.error("Error fetching drivers:", error);
      triggerAlert("error", "Error fetching drivers");
    } else {
      setDrivers(data);
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewDelivery((prev) => ({ ...prev, [name]: value }));

    if (name === "id" && value) {
      fetchDriverName(value);
    }
  };

  const fetchDriverName = async (driverId) => {
    const { data, error } = await supabase
      .from("drivers")
      .select("name")
      .eq("driver_id", driverId)
      .single();

    if (error) {
      console.error("Error fetching driver name:", error);
      setNewDelivery((prev) => ({ ...prev, name: "" }));
    } else {
      setNewDelivery((prev) => ({ ...prev, name: data.name }));
    }
  };

  const handleAddDelivery = async () => {
    const { data: driver, error } = await supabase
      .from("drivers")
      .select("*")
      .eq("driver_id", newDelivery.id)
      .single();

    if (error || !driver) {
      console.error("Driver not found:", error);
      triggerAlert("error", "Driver not found");
      return;
    }

    const updatedTotal =
      driver.total_collected + parseInt(newDelivery.total_collected, 10);
    const { error: updateError } = await supabase
      .from("drivers")
      .update({ total_collected: updatedTotal })
      .eq("driver_id", newDelivery.id);

    if (updateError) {
      console.error("Error updating delivery:", updateError);
      triggerAlert("error", "Error updating delivery");
    } else {
      triggerAlert("submit");
    }

    setNewDelivery({ id: "", name: "", total_collected: "" });
  };

  const handleClaim = (driverId) => {
    const driver = drivers.find((d) => d.driver_id === driverId);
    if (!driver) return;

    setSelectedDriverId(driverId);
    setShowConfirmClaimModal(true);
  };

  const confirmClaim = async () => {
    const driver = drivers.find((d) => d.driver_id === selectedDriverId);
    if (!driver) return;

    const updatedPoints = driver.points + 1;
    const updatedTotal = driver.total_collected - 100000; // Reset claim condition

    const { error } = await supabase
      .from("drivers")
      .update({ points: updatedPoints, total_collected: updatedTotal })
      .eq("driver_id", selectedDriverId);

    if (error) {
      console.error("Error claiming points:", error);
      triggerAlert("error", "Error claiming points");
    } else {
      triggerAlert("claim");
    }

    setShowConfirmClaimModal(false);
  };

  const handleDeleteConfirm = (driverId) => {
    setSelectedDriverId(driverId);
    setShowConfirmDeleteModal(true);
  };

  const confirmDelete = async () => {
    const { error } = await supabase
      .from("drivers")
      .delete()
      .eq("driver_id", selectedDriverId);

    if (error) {
      console.error("Error deleting driver:", error);
      triggerAlert("error", "Error deleting driver");
    } else {
      setDrivers((prevDrivers) =>
        prevDrivers.filter((driver) => driver.driver_id !== selectedDriverId)
      );
      triggerAlert("delete");
      setSelectedDriverId(null);
    }

    setShowConfirmDeleteModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.reload();
  };

  const addDriver = async () => {
    const { data: lastDriver, error: fetchError } = await supabase
      .from("drivers")
      .select("driver_id")
      .order("driver_id", { ascending: false })
      .limit(1)
      .single();

    if (fetchError) {
      console.error("Error fetching last driver ID:", fetchError);
      triggerAlert("error", "Error fetching last driver ID");
      return;
    }

    const newDriverId = lastDriver ? lastDriver.driver_id + 1 : 100;

    const { error: insertError } = await supabase.from("drivers").insert({
      driver_id: newDriverId,
      name: newDriverName,
    });

    if (insertError) {
      console.error("Error adding driver:", insertError);
      triggerAlert("error", "Error adding driver");
    } else {
      setNewDriverName("");
      setShowAddDriverModal(false);
      triggerAlert("add");
    }
  };

  const filteredDrivers = drivers.filter(
    (driver) =>
      driver.name.toLowerCase().includes(search.toLowerCase()) ||
      driver.driver_id.toString().includes(search)
  );

  const triggerAlert = (type, message = null) => {
    const config = alertConfigs[type] || alertConfigs.error;
    if (message) {
      config.message = message;
    }
    setAlertConfig(config);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 1500);
  };

  return (
    <div className="mx-auto p-4 bg-gray-100 dark:bg-gray-800 min-h-screen">
      <ToastContainer />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
          Drivers Incentive Program
        </h1>
        <div className="flex items-center">
          <p className="text-gray-600 dark:text-gray-400 mr-4">
            Welcome, {user.username}
          </p>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white py-2 px-4 rounded flex items-center"
          >
            <FaSignOutAlt className="mr-2" />
            Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-700 col-span-1 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">
            Add Delivered Details
          </h2>
          <div className="mb-4">
            <label
              htmlFor="driverId"
              className="block text-gray-700 dark:text-gray-300 font-bold mb-2"
            >
              Driver ID
            </label>
            <input
              type="number"
              name="id"
              placeholder="Enter Driver ID"
              value={newDelivery.id}
              onChange={handleInputChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-600 dark:text-gray-300"
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="driverName"
              className="block text-gray-700 dark:text-gray-300 font-bold mb-2"
            >
              Driver Name
            </label>
            <input
              type="text"
              name="name"
              placeholder="Driver Name"
              value={newDelivery.name}
              onChange={handleInputChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-600 dark:text-gray-300"
              disabled
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="deliveredAmount"
              className="block text-gray-700 dark:text-gray-300 font-bold mb-2"
            >
              Amount Delivered
            </label>
            <input
              type="number"
              name="total_collected"
              placeholder="Enter Amount Delivered"
              value={newDelivery.total_collected}
              onChange={handleInputChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-600 dark:text-gray-300"
            />
          </div>
          <button
            onClick={handleAddDelivery}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-300"
          >
            Submit
          </button>
        </div>

        <div className="bg-white col-span-2 dark:bg-gray-700 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">
            Drivers List
          </h2>
          <div className="flex mb-4">
            <div className="relative w-full mr-2">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <FaSearch className="text-gray-500 dark:text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 pl-10 pr-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-600 dark:text-gray-300"
              />
            </div>
            <button
              onClick={() => setShowAddDriverModal(true)}
              className="bg-green-500 hover:bg-green-700 flex text-white font-bold pt-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-300"
            >
              <FaPlus className="mr-2 mt-1" />
              <div> Add </div>
            </button>
          </div>
          {loading ? (
            <p className="text-gray-600 dark:text-gray-400">Loading drivers...</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y-2 divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800 text-sm">
                <thead className="ltr:text-left rtl:text-right">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 dark:text-gray-200">
                      ID
                    </th>
                    <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 dark:text-gray-200">
                      Name
                    </th>
                    <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 dark:text-gray-200">
                      Total Amount Delivered
                    </th>
                    <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 dark:text-gray-200">
                      Points
                    </th>
                    <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 dark:text-gray-200">
                      Date
                    </th>
                    <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 dark:text-gray-200">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredDrivers.map((driver) => (
                    <tr
                      key={driver.driver_id}
                      className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-300"
                    >
                      <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 dark:text-gray-300">
                        {driver.driver_id}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-700 dark:text-gray-400">
                        {driver.name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-700 dark:text-gray-400">
                        {driver.total_collected}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-700 dark:text-gray-400">
                        {driver.points}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-700 dark:text-gray-400">
                        {new Date(driver.created_at).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2">
                        <button
                          className={`bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-300 ${
                            driver.total_collected < 100000
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                          onClick={() => handleClaim(driver.driver_id)}
                          disabled={driver.total_collected < 100000}
                        >
                          <FaClipboardCheck className="mr-2" />
                          Claim
                        </button>
                        <button
                          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-300 ml-2"
                          onClick={() => handleDeleteConfirm(driver.driver_id)}
                        >
                          <FaTrashAlt className="mr-2" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showConfirmClaimModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-600 bg-opacity-50">
          <div className="bg-white dark:bg-gray-700 p-6 rounded shadow-md">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">
              Confirm Claim
            </h2>
            <p className="text-gray-700 dark:text-gray-400 mb-4">
              Are you sure you want to claim points for this driver?
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowConfirmClaimModal(false)}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-300 mr-2"
              >
                Cancel
              </button>
              <button
                onClick={confirmClaim}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-300"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-600 bg-opacity-50">
          <div className="bg-white dark:bg-gray-700 p-6 rounded shadow-md">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">
              Confirm Delete
            </h2>
            <p className="text-gray-700 dark:text-gray-400 mb-4">
              Are you sure you want to delete this driver?
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowConfirmDeleteModal(false)}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-300 mr-2"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-300"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddDriverModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-600 bg-opacity-50">
          <div className="bg-white dark:bg-gray-700 p-6 rounded shadow-md">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">
              Add Driver
            </h2>
            <input
              type="text"
              placeholder="Driver Name"
              value={newDriverName}
              onChange={(e) => setNewDriverName(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-600 dark:text-gray-300 mb-4"
            />
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddDriverModal(false)}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-300 mr-2"
              >
                Cancel
              </button>
              <button
                onClick={addDriver}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-300"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

<AnimatePresence>
  {showAlert && alertConfig && (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 50, opacity: 0 }}
      className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 flex items-center px-4 py-3 rounded-lg shadow-md ${alertConfig.color} text-white`}
    >
      {alertConfig.icon}
      <span className="ml-2">{alertConfig.message}</span>
    </motion.div>
  )}
</AnimatePresence>


    </div>
  );
};

export default Home;
