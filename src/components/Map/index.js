import React, { useEffect, useState, useRef } from "react";
// * Google maps
import GoogleMapReact from "google-map-react";
// * Styles
import io from "socket.io-client";
import { useGeolocated } from "react-geolocated";
import { mapStyles } from "./mapStyles";
import "./styles.sass";
const socket = io.connect("https://lifeline-socket.herokuapp.com/");
export const MapComponent = () => {
  const [room, setRoom] = useState();
  const [message, setMessage] = useState("");
  // const [messages, setMessages] = useState([]);
  const messages = useRef([]);
  const [myLocation, setMyLocation] = useState();
  const [userLocation, setUserLocation] = useState();
  const [fetchAmbulance, setFetchAmbulance] = useState({
    loading: false,
    success: true,
    error: false,
    data: {
      _id: "123",
      plate: "123",
      driver: {
        name: "John",
        lastName: "Doe",
      }
    },
  });
  async function fetchAmbulanceData() {
    setFetchAmbulance({
      loading: true,
      success: false,
      error: false,
      data: {},
    });
    try {
      const response = await fetch(
        `https://lifeline-hack.herokuapp.com/api/ambulance/5/`
      );
      const data = await response.json();
      setFetchAmbulance({
        loading: false,
        success: true,
        error: false,
        data: data,
      });
    } catch (error) {
      setFetchAmbulance({
        loading: false,
        success: false,
        error: true,
        data: {},
      });
    }
  }
  const getUseLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setMyLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      });
    }
  };

  useEffect(() => {
    // fetchAmbulanceData();
    getUseLocation();
  }, []);
  useEffect(() => {
    socket.on("alert__ambulance", (data) => {
      setRoom(data.room);
      setUserLocation({
        lat: data.userLocation?.latitude,
        lng: data.userLocation?.longitude,
      });
      socket.emit("ambulance__join__room", {
        room: data.room,
      });
    });
    socket.on("patient__change__location", (data) => {
      setUserLocation({
        lat: data.latitude,
        lng: data.longitude,
      });
    });
    socket.on("receive__message", (data) => {
      messages.current.push(data);
    });
    return () => {
      socket.off("alert__ambulance");
      socket.off("ambulance__join__room");
      socket.off("patient__change__location");
      socket.off("receive__message");
    };
  }, []);

  useEffect(() => {
    if (fetchAmbulance.success) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          socket.emit("ambulance__joined", {
            id: fetchAmbulance.data?._id,
            location: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
          });
        });
      }
    }
  }, [fetchAmbulance.success]);
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          socket.emit("change__ambulance__location", {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            room: room,
          });
          setMyLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log(error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
        }
      );
    }
  }, [room]);
  if (!myLocation || fetchAmbulance.loading) {
    return <div>Loading...</div>;
  }
  return (
    <div style={{ height: "100vh", width: "100%" }} className="map__container">
      <div className="patient__info">
        <span className="connection__server">
          {socket.connected ? "Ambulance connected to server" : "Disconnected"}
        </span>
        {!userLocation ? (
          <div className="text__info">
            <h1>Lifeline</h1>
            <h3>Waiting for patient to send location</h3>
            <div className="loading__container">
              <i className="fas fa-spinner fa-spin"></i>
            </div>
          </div>
        ) : (
          <>
            <div className="patient__title">
              <h2>
                Patient details{" "}
                <img
                  src="https://img.icons8.com/color/344/boy-avatar.png"
                  height="50px"
                  width="50px"
                />
              </h2>
            </div>

            <div className="patient__info__name">
              <span>John</span>
            </div>
            <div className="patient__info__age">
              <span>Age: 25</span>
            </div>
            <div className="patient__info__dicease">
              <span>Issue: Medical emergency</span>
            </div>
            <div className="patient__info__location">
              <span>
                Location of patient: {userLocation.lat}, {userLocation.lng}
              </span>
            </div>
          </>
        )}
        {fetchAmbulance.success && (
          <div className="ambulance__info">
            <div className="ambulance__title">
              <h3>Ambulance details</h3>
              <img
                src="https://img.icons8.com/color/344/ambulance.png"
                height="50px"
                width="50px"
              />
            </div>
            <div className="ambulance__info__name">
              <span>Plate number: {fetchAmbulance.data?.plate} </span>
            </div>
            <span>Drivers</span>
            {fetchAmbulance.data?.driver?.map((driver) => (
              <div className="ambulance__info__driver">
                <span>
                  Driver: {driver.name} {driver.lastName}
                </span>
              </div>
            ))}
          </div>
        )}
        {userLocation && (
          <>
            <h3>Messages</h3>

            <div className="messages__history">
              {messages.current.map((message, index) => (
                <div
                  className={`
                message__item ${
                  message.user == fetchAmbulance.data?.plate
                    ? "my__message"
                    : "patient__message"
                }
                `}
                >
                  <span>
                    {message.user}: {message.message}
                  </span>
                </div>
              ))}
            </div>

            <div className="chat__container">
              <div className="input__container">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type message"
                />
                <button
                  onClick={() => {
                    messages.current.push({
                      user: fetchAmbulance.data?.plate,
                      message: message,
                    });

                    socket.emit("send__message", {
                      message: message,
                      room: room,
                      username: fetchAmbulance.data?.plate,
                    });
                    setMessage("");
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      <div className="map__container__map">
        <GoogleMapReact
          bootstrapURLKeys={{ key: process.env.REACT_APP_GOOGLE_MAPS_API_KEY }}
          defaultCenter={{
            lat: myLocation?.lat,
            lng: myLocation?.lng,
          }}
          defaultZoom={19}
          options={{ styles: mapStyles }}
        >
          <div
            className="ambulance__marker"
            style={{
              transition: "all 0.5s ease",
            }}
            lat={myLocation?.lat}
            lng={myLocation?.lng}
          >
            <img src="https://img.icons8.com/emoji/48/000000/ambulance-emoji.png" />
          </div>
          {userLocation && (
            <div
              className="user__marker"
              style={{
                transition: "all 0.5s ease",
              }}
              lat={userLocation?.lat}
              lng={userLocation?.lng}
            >
              <img
                src="https://img.icons8.com/color/344/boy-avatar.png"
                height="50px"
                width="50px"
              />
            </div>
          )}
        </GoogleMapReact>
      </div>
    </div>
  );
};
