import time
import math
import random
from flask import Flask, render_template
from flask_socketio import SocketIO, emit

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# Rover & Mission Physics State
rover_state = {
    "battery": 100.0,
    "solar_output": 140.0,
    "motor_temp": 22.0,
    "dust_factor": 0.15,
    "status": "IDLE",
    "position": {"x": 0.0, "z": 0.0},
    "spectrometer_progress": 0,
    "thermal_data_progress": 0,
    "dsn_telemetry_progress": 0,

    # Launch Dynamics
    "launch_altitude": 0.0,     # km
    "launch_velocity": 0.0,     # m/s
    "launch_g_force": 1.0,      # Gs
    "launch_thrust": 0.0,       # kN

    # Mars Landing Dynamics (EDL)
    "landing_altitude": 125.0,  # km
    "landing_velocity": 5500.0, # m/s
    "heatshield_temp": 20.0,    # °C
    "airbags_deployed": False,
    "parachute_deployed": False,
    "landing_status": "ORBIT"
}

@socketio.on('connect')
def handle_connect():
    print("[Python Telemetry Server]: Mission Control Client Connected.")
    emit('telemetry_update', rover_state)

@socketio.on('start_launch_physics')
def handle_launch():
    rover_state["status"] = "LAUNCHING"
    rover_state["launch_altitude"] = 0.0
    rover_state["launch_velocity"] = 0.0
    
    # Delta II Rocket Simulation Loop
    mass = 230000  # kg initial mass
    fuel_burn_rate = 800 # kg/s
    thrust = 3100000 # N thrust
    g0 = 9.81
    
    for t in range(1, 11):
        time.sleep(0.5)
        current_mass = mass - (fuel_burn_rate * t * 10)
        net_force = thrust - (current_mass * g0)
        acceleration = net_force / current_mass
        
        rover_state["launch_thrust"] = round(thrust / 1000, 1)
        rover_state["launch_g_force"] = round((acceleration + g0) / g0, 2)
        rover_state["launch_velocity"] += round(acceleration * 5, 1)
        rover_state["launch_altitude"] += round((rover_state["launch_velocity"] * 5) / 1000, 2)
        
        emit('telemetry_update', rover_state, broadcast=True)

@socketio.on('start_landing_physics')
def handle_landing():
    rover_state["status"] = "LANDING"
    rover_state["landing_altitude"] = 125.0
    rover_state["landing_velocity"] = 5500.0
    rover_state["heatshield_temp"] = 20.0
    rover_state["airbags_deployed"] = False
    rover_state["parachute_deployed"] = False
    
    mars_g = 3.71
    
    # Mars Atmosphere Entry, Descent, Landing (EDL) Simulation
    for step in range(1, 16):
        time.sleep(0.6)
        
        # Aerodynamic deceleration peak
        if rover_state["landing_altitude"] > 40:
            drag = 0.00008 * (rover_state["landing_velocity"] ** 2)
            rover_state["landing_velocity"] = max(400.0, rover_state["landing_velocity"] - drag)
            rover_state["heatshield_temp"] = min(1500.0, rover_state["heatshield_temp"] + drag * 1.5)
            rover_state["landing_altitude"] -= 6.0
        # Parachute Deployment Phase
        elif rover_state["landing_altitude"] > 2:
            rover_state["parachute_deployed"] = True
            rover_state["landing_velocity"] = max(80.0, rover_state["landing_velocity"] - 80.0)
            rover_state["heatshield_temp"] = max(200.0, rover_state["heatshield_temp"] - 120.0)
            rover_state["landing_altitude"] -= 3.0
        # Airbag Inflation & Touchdown Phase
        else:
            rover_state["airbags_deployed"] = True
            rover_state["landing_velocity"] = max(0.0, rover_state["landing_velocity"] - 20.0)
            rover_state["landing_altitude"] = max(0.0, rover_state["landing_altitude"] - 0.4)
            
        emit('telemetry_update', rover_state, broadcast=True)

@socketio.on('execute_action')
def handle_action(data):
    action = data.get('action')
    if action == 'analyze':
        rover_state['battery'] = max(0.0, rover_state['battery'] - 25.0)
        rover_state['motor_temp'] += 3.2
        rover_state['status'] = "SPECTROMETER_ACTIVE"
        rover_state['spectrometer_progress'] = min(100, rover_state['spectrometer_progress'] + random.randint(25, 40))
        rover_state['thermal_data_progress'] = min(100, rover_state['thermal_data_progress'] + random.randint(20, 35))

    elif action == 'drive':
        rover_state['battery'] = max(0.0, rover_state['battery'] - 15.0)
        rover_state['motor_temp'] += 8.5
        rover_state['status'] = "DRIVING"
        rover_state['position']['x'] += round(random.uniform(-0.5, 0.5), 2)
        rover_state['position']['z'] += round(random.uniform(-0.5, 0.5), 2)
        rover_state['dsn_telemetry_progress'] = min(100, rover_state['dsn_telemetry_progress'] + random.randint(15, 30))

    elif action == 'transmit':
        rover_state['battery'] = max(0.0, rover_state['battery'] - 30.0)
        rover_state['motor_temp'] += 5.0
        rover_state['status'] = "HIGH_GAIN_TRANSMITTING"
        rover_state['dsn_telemetry_progress'] = min(100, rover_state['dsn_telemetry_progress'] + random.randint(35, 50))

    emit('telemetry_update', rover_state, broadcast=True)

@socketio.on('reset_state')
def handle_reset():
    global rover_state
    rover_state = {
        "battery": 100.0,
        "solar_output": 140.0,
        "motor_temp": 22.0,
        "dust_factor": 0.15,
        "status": "IDLE",
        "position": {"x": 0.0, "z": 0.0},
        "spectrometer_progress": 0,
        "thermal_data_progress": 0,
        "dsn_telemetry_progress": 0,
        "launch_altitude": 0.0,
        "launch_velocity": 0.0,
        "launch_g_force": 1.0,
        "launch_thrust": 0.0,
        "landing_altitude": 125.0,
        "landing_velocity": 5500.0,
        "heatshield_temp": 20.0,
        "airbags_deployed": False,
        "parachute_deployed": False,
        "landing_status": "ORBIT"
    }
    emit('telemetry_update', rover_state, broadcast=True)

def simulation_physics_loop():
    sim_time = 0
    while True:
        time.sleep(2)
        sim_time += 1
        sun_intensity = max(0, math.sin(sim_time * 0.1))
        rover_state['solar_output'] = round(140.0 * sun_intensity * (1.0 - rover_state['dust_factor']), 2)
        
        if rover_state['status'] == "IDLE" and sun_intensity > 0.2:
            rover_state['battery'] = min(100.0, round(rover_state['battery'] + (rover_state['solar_output'] * 0.02), 2))
            
        rover_state['motor_temp'] = max(20.0, round(rover_state['motor_temp'] - 0.4, 1))
        socketio.emit('telemetry_update', rover_state)

if __name__ == '__main__':
    socketio.start_background_task(target=simulation_physics_loop)
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)