import React, { useContext, useEffect, useState } from "react";
import { Col, ListGroup, Row } from "react-bootstrap";
import {  useSelector } from "react-redux";
import { AppContext } from "../context/appContext";
// import { addNotifications, resetNotifications } from "../features/userSlice";
import "./Sidebar.css";

function Sidebar() {
    const user = useSelector((state) => state.user);
    // const dispatch = useDispatch();
    const { socket, setMembers, members, setCurrentRoom, setRooms, privateMemberMsg, rooms, setPrivateMemberMsg, currentRoom } = useContext(AppContext);

    function joinRoom(room, isPublic = true) {
        if (!user) {
            return alert("Please login");
        }
        socket.emit("join-room", room, currentRoom);
        setCurrentRoom(room);

        if (isPublic) {
            setPrivateMemberMsg(null);
        }
        // // dispatch for notifications
        // dispatch(resetNotifications(room));
    }

 

    // socket.off("notifications").on("notifications", (room) => {
    //     if (currentRoom != room) dispatch(addNotifications(room));
    // });

    useEffect(() => {
        if (user) {
            setCurrentRoom("general");
            getRooms();
            socket.emit("join-room", "general");
            socket.emit("new-user");
        }
    }, []);

    socket.off("new-user").on("new-user", (payload) => {
        setMembers(payload);
    });

    function getRooms() {
        fetch("http://localhost:5000/rooms")
            .then((res) => res.json())
            .then((data) => setRooms(data));
    }


    function orderIds(id1, id2) {
        if (id1 > id2) {
            return id1 + "-" + id2;
        } else {
            return id2 + "-" + id1;
        }
    }

    function handlePrivateMemberMsg(member) {
        setPrivateMemberMsg(member);
        const roomId = orderIds(user._id, member._id);
        joinRoom(roomId, false);
    }


    if (!user) {
        return <></>;
    }
    return (
        <>
           <h2>Available rooms</h2>
<ListGroup>
  {rooms.map((room, idx) => (
    <ListGroup.Item
      className="rooms-list"
      key={idx}
      onClick={() => joinRoom(room)}
      active={room === currentRoom}
      style={{
        backgroundColor: room === currentRoom ? '#317874' : 'transparent',
        borderColor: '#317874',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between'
      }}
    >
      {room}{' '}
      {currentRoom !== room && user.newMessages && user.newMessages[room] && (
        <span className="badge rounded-pill bg-primary">{user.newMessages[room]}</span>
      )}
    </ListGroup.Item>
  ))}
</ListGroup>


<h2>Members</h2>
{members.map((member) => (
    <ListGroup.Item
        key={member.id}
        style={{
            cursor: "pointer",
            backgroundColor: privateMemberMsg?._id === member._id ? "#317874" : "transparent", // Set the background color for the active member item
            borderColor: "#317874"
        }}
        active={privateMemberMsg?._id === member._id}
        onClick={() => handlePrivateMemberMsg(member)}
        disabled={member._id === user._id}
    >
        <Row>
            <Col xs={2} className="member-status">
                <img src={member.picture} className="member-status-img" />
                {member.status === "online" ? (
                    <i className="fas fa-circle sidebar-online-status"></i>
                ) : (
                    <i className="fas fa-circle sidebar-offline-status"></i>
                )}
            </Col>
            <Col xs={9}>
                {member.name}
                {member._id === user?._id && " (You)"}
                {member.status === "offline" && " (Offline)"}
            </Col>
            <Col xs={1}>
                {user && user.newMessages && (
                    <span className="badge rounded-pill bg-primary">{user.newMessages[orderIds(member._id, user._id)]}</span>
                )}
            </Col>
        </Row>
    </ListGroup.Item>
))}

        </>
    );
}

export default Sidebar;