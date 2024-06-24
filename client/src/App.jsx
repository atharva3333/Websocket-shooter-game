import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Character from './assets/Character.gif';
const socket = new WebSocket('ws://localhost:8080');

const App = () => {
  const [players, setPlayers] = useState({});
  const [id, setId] = useState(uuidv4());
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [velocity, setVelocity] = useState({ vx: 0, vy: 0 });
  const [name, setName] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [bullets, setBullets] = useState([]);

  useEffect(() => {
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'players') {
        setPlayers(data.players.reduce((acc, player) => {
          acc[player.id] = player;
          return acc;
        }, {}));
      } else if (data.type === 'bullet') {
        setBullets((prevBullets) => [...prevBullets, data.bullet]);
      }
    };

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'w':
          setVelocity((prev) => ({ ...prev, vy: -2 }));
          break;
        case 's':
          setVelocity((prev) => ({ ...prev, vy: 2 }));
          break;
        case 'a':
          setVelocity((prev) => ({ ...prev, vx: -2 }));
          break;
        case 'd':
          setVelocity((prev) => ({ ...prev, vx: 2 }));
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (e) => {
      switch (e.key) {
        case 'w':
        case 's':
          setVelocity((prev) => ({ ...prev, vy: 0 }));
          break;
        case 'a':
        case 'd':
          setVelocity((prev) => ({ ...prev, vx: 0 }));
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const move = () => {
      setPosition((prev) => {
        const newPos = { x: prev.x + velocity.vx, y: prev.y + velocity.vy };

        // Boundary check to ensure the player doesn't move outside the box
        if (newPos.x < 0) newPos.x = 0;
        if (newPos.x > 880) newPos.x = 880; // Box width - Player width (900 - 20)
        if (newPos.y < 0) newPos.y = 0;
        if (newPos.y > 580) newPos.y = 570; // Box height - Player height (600 - 20)

        socket.send(JSON.stringify({ type: 'move', id, position: newPos }));
        return newPos;
      });
    };

    if (isRegistered) {
      const interval = setInterval(move, 16); // Approximately 60 FPS
      return () => clearInterval(interval);
    }
  }, [velocity, id, isRegistered]);

  const handleRegister = (e) => {
    e.preventDefault();
    setIsRegistered(true);
    socket.send(JSON.stringify({ type: 'register', id, name }));
  };

  const handleLeaveRoom = () => {
    socket.close(); // Close the WebSocket connection
    setPlayers({}); // Reset the players state
    setIsRegistered(false); // Reset the registration state
  };

  const handleMouseClick = (e) => {
    const rect = e.target.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const angle = Math.atan2(mouseY - position.y, mouseX - position.x);
    const speed = 5;

    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    const bullet = { id: uuidv4(), x: position.x, y: position.y, vx, vy };
    setBullets((prevBullets) => [...prevBullets, bullet]);

    socket.send(JSON.stringify({ type: 'bullet', bullet }));
  };

  useEffect(() => {
    const moveBullets = () => {
      setBullets((prevBullets) =>
        prevBullets.map((bullet) => {
          const distance = Math.sqrt(Math.pow(bullet.vx, 2) + Math.pow(bullet.vy, 2));
          const dx = bullet.vx / distance;
          const dy = bullet.vy / distance;
          const speed = 5;
          const newX = bullet.x + dx * speed;
          const newY = bullet.y + dy * speed;
          
          return {
            ...bullet,
            x: newX,
            y: newY,
          };
        }).filter((bullet) => bullet.x >= 0 && bullet.x <= 900 && bullet.y >= 0 && bullet.y <= 600)
      );
    };
    

    const interval = setInterval(moveBullets, 16); // Approximately 60 FPS
    return () => clearInterval(interval);
  }, []);

  if (!isRegistered) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl mb-4">Register</h1>
        <form onSubmit={handleRegister} className="flex flex-col items-center">
          <div className="mb-4">
            <label className="block text-lg mb-2">
              Name:
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="border-2 border-gray-300 p-2 rounded-md ml-2"
              />
            </label>
          </div>
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-md">
            Start Game
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div
        className="relative border-2 border-black"
        style={{
          width: '900px',
          height: '600px',
        }}
        onClick={handleMouseClick}
      >
        {Object.values(players).map((p) => (
          <div key={p.id} className="absolute" style={{ left: p.position?.x, top: p.position?.y }}>
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-center text-sm bg-black text-white rounded-xl px-2">
              {p.name}
            </div>
            <img
              src={Character}
              className='object-cover'
              alt="Player Character"
              style={{
                width: '30px',
                height: '30px',
              }}
            />
          </div>
        ))}
        {bullets.map((bullet) => (
          <div
            key={bullet.id}
            className="absolute bullet"
            style={{
              left: bullet.x,
              top: bullet.y,
              width: '5px',
              height: '5px',
              backgroundColor: 'red',
              borderRadius: '50%'
            }}
          />
        ))}
      </div>
      <button onClick={handleLeaveRoom} className="bg-red-500 text-white px-4 py-2 rounded-md mt-4">
        Leave Room
      </button>
    </div>
  );
};

export default App;
