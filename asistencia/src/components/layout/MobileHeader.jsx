import BrandLogo from './BrandLogo.jsx';
import { SoundButton, ThemeButton } from './Controls.jsx';

export default function MobileHeader() {
  return (
    <header className="mobile-header">
      <BrandLogo compact />
      <div className="mobile-header__tools">
        <ThemeButton />
        <SoundButton />
      </div>
    </header>
  );
}
