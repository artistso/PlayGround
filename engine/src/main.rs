use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Instant;

const PORT: u16 = 3002;

#[derive(Clone, Copy)]
struct Body { x: f64, z: f64, vx: f64, vz: f64, y: f64, vy: f64 }

struct Engine {
    body: Body,
    phase: f64,
    collected: [bool; 7],
    charge_mask: u8,
    score: u32,
    landed: bool,
    status: String,
    last: Instant,
}

impl Engine {
    fn new() -> Self {
        Self {
            body: Body { x: 0.0, z: 0.0, vx: 0.0, vz: 0.0, y: 0.0, vy: 0.0 },
            phase: 0.0, collected: [false; 7], charge_mask: 0, score: 0,
            landed: true, status: "A quiet universe is waiting. Find the first zero echo.".into(), last: Instant::now(),
        }
    }

    fn tick(&mut self, data: &str) {
        let dt = number(data, "dt").unwrap_or(0.033).clamp(0.0, 0.075);
        let ix = number(data, "x").unwrap_or(0.0).clamp(-1.0, 1.0);
        let iz = number(data, "z").unwrap_or(0.0).clamp(-1.0, 1.0);
        let phase = number(data, "phase").unwrap_or(0.0).clamp(-1.0, 1.0);
        let interact = boolean(data, "interact");
        let jump = boolean(data, "jump");
        self.phase = (self.phase + phase * dt * 0.72).clamp(-1.0, 1.0);

        // Newtonian movement: acceleration, drag, gravity and a spring-damper ground contact.
        let thrust = 14.0;
        self.body.vx += (ix * thrust - self.body.vx * 3.8) * dt;
        self.body.vz += (iz * thrust - self.body.vz * 3.8) * dt;
        let speed = (self.body.vx * self.body.vx + self.body.vz * self.body.vz).sqrt();
        if speed > 8.0 { self.body.vx *= 8.0 / speed; self.body.vz *= 8.0 / speed; }
        self.body.x = (self.body.x + self.body.vx * dt).clamp(-88.0, 88.0);
        self.body.z = (self.body.z + self.body.vz * dt).clamp(-88.0, 88.0);
        if jump && self.landed { self.body.vy = 6.4; self.landed = false; }
        if !self.landed {
            self.body.vy -= 18.0 * dt;
            self.body.y += self.body.vy * dt;
            if self.body.y <= 0.0 { self.body.y = 0.0; self.body.vy = 0.0; self.landed = true; }
        }
        self.last = Instant::now();

        if interact {
            const SITES: [(f64, f64); 7] = [(0.0, -26.0), (12.0, -43.0), (-13.0, -44.0), (0.0, 27.0), (34.0, 5.0), (-35.0, 8.0), (0.0, 58.0)];
            let mut found = false;
            for (i, (x, z)) in SITES.iter().enumerate() {
                if !self.collected[i] && distance(self.body.x, self.body.z, *x, *z) < 4.4 {
                    self.collected[i] = true; found = true; self.score += 1;
                    if i < 3 {
                        self.status = format!("Zero echo {} recorded · conjugate pair balanced.", i + 1);
                    } else if i < 6 {
                        let bit = 1 << (i - 3); self.charge_mask |= bit;
                        let names = ["RED", "GREEN", "BLUE"];
                        self.status = format!("{} color charge captured · {} / 3 quarks.", names[i - 3], self.charge_mask.count_ones());
                        if self.charge_mask == 7 { self.status = "COLOR CONFINEMENT: three charges form a neutral baryon. A stable hadron!".into(); }
                    } else {
                        self.status = "Vortex sink sampled · circulation smoothed by the viscous core.".into();
                    }
                    break;
                }
            }
            if !found { self.status = "Nothing to sample here. Follow the luminous traces to a field node.".into(); }
        }
    }

    fn json(&self) -> String {
        let c = self.collected.iter().map(|b| if *b {"true"} else {"false"}).collect::<Vec<_>>().join(",");
        format!("{{\"x\":{:.4},\"z\":{:.4},\"vx\":{:.4},\"vz\":{:.4},\"y\":{:.4},\"phase\":{:.4},\"collected\":[{}],\"chargeMask\":{},\"score\":{},\"status\":\"{}\"}}",
            self.body.x, self.body.z, self.body.vx, self.body.vz, self.body.y, self.phase, c, self.charge_mask, self.score, escape(&self.status))
    }
}

fn distance(x: f64, z: f64, a: f64, b: f64) -> f64 { ((x-a).powi(2) + (z-b).powi(2)).sqrt() }
fn number(s: &str, key: &str) -> Option<f64> {
    let at = s.find(&format!("\"{key}\""))? + key.len() + 2;
    let tail = s[at..].trim_start().strip_prefix(':')?.trim_start();
    let end = tail.find(|c: char| !c.is_ascii_digit() && c != '-' && c != '.' && c != '+')?;
    tail[..end].parse().ok().or_else(|| tail.parse().ok())
}
fn boolean(s: &str, key: &str) -> bool {
    s.find(&format!("\"{key}\"" )).map(|i| s[i..].contains(":true")).unwrap_or(false)
}
fn escape(s: &str) -> String { s.replace('\\', "\\\\").replace('"', "\\\"").replace('\n', " ") }

fn response(stream: &mut TcpStream, status: &str, content_type: &str, body: &[u8]) {
    let head = format!("HTTP/1.1 {status}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Headers: Content-Type\r\nConnection: close\r\n\r\n", body.len());
    let _ = stream.write_all(head.as_bytes()); let _ = stream.write_all(body);
}
fn handle(mut stream: TcpStream, state: Arc<Mutex<Engine>>) {
    let mut buffer = vec![0u8; 8192];
    let n = match stream.read(&mut buffer) { Ok(n) if n > 0 => n, _ => return };
    let request = String::from_utf8_lossy(&buffer[..n]);
    let line = request.lines().next().unwrap_or("");
    if line.starts_with("OPTIONS ") { response(&mut stream, "204 No Content", "text/plain", b""); return; }
    if line.starts_with("GET / ") || line.starts_with("GET /index.html") {
        let page = include_str!("../../index.html"); response(&mut stream, "200 OK", "text/html; charset=utf-8", page.as_bytes()); return;
    }
    if line.starts_with("GET /api/state") {
        let json = state.lock().unwrap().json(); response(&mut stream, "200 OK", "application/json", json.as_bytes()); return;
    }
    if line.starts_with("POST /api/reset") {
        *state.lock().unwrap() = Engine::new(); let json = state.lock().unwrap().json(); response(&mut stream, "200 OK", "application/json", json.as_bytes()); return;
    }
    if line.starts_with("POST /api/tick") {
        let body = request.split("\r\n\r\n").nth(1).unwrap_or("");
        let mut engine = state.lock().unwrap(); engine.tick(body); let json = engine.json(); drop(engine);
        response(&mut stream, "200 OK", "application/json", json.as_bytes()); return;
    }
    response(&mut stream, "404 Not Found", "text/plain", b"not found");
}

fn main() -> std::io::Result<()> {
    let address = format!("0.0.0.0:{}", PORT);
    let listener = TcpListener::bind(&address)?;
    let state = Arc::new(Mutex::new(Engine::new()));
    println!("Penrose Field Engine listening on http://localhost:{PORT}");
    for stream in listener.incoming() {
        if let Ok(stream) = stream { let state = state.clone(); thread::spawn(move || handle(stream, state)); }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn motion_integrates_acceleration_and_drag() {
        let mut e = Engine::new(); e.tick(r#"{"dt":0.05,"x":1,"z":0}"#);
        assert!(e.body.x > 0.0 && e.body.vx > 0.0);
    }
    #[test] fn three_color_charges_confine_into_neutral_hadron() {
        let mut e = Engine::new();
        for (x,z) in [(0.0,27.0),(34.0,5.0),(-35.0,8.0)].iter() {
            e.body.x = *x; e.body.z = *z;
            e.tick(r#"{"dt":0,"interact":true}"#);
        }
        assert_eq!(e.charge_mask, 7); assert!(e.status.contains("neutral baryon"));
    }
    #[test] fn phase_is_bounded() {
        let mut e = Engine::new(); e.tick(r#"{"dt":0.075,"phase":1}"#); assert!(e.phase <= 1.0);
    }
}
