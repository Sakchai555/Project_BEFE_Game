import { Link } from 'react-router-dom';

export default function StoreFooter() {
  return (<footer><Link className="brand" to="/"><span className="brand-icon">P</span>PLAYLOG<span className="brand-dot">.</span></Link><span>สร้างโดยผู้เล่น เพื่อผู้เล่น</span><span>© 2025 PLAYLOG</span></footer>);
}
