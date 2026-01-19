import logoImage from "../assets/logo.png"; 
interface LogoProps {
  className?: string;
}

export function Logo({ className = "w-6 h-6" }: LogoProps) {
  return (
    <img
      src={logoImage}
      alt="BookArc Logo"
      className={`${className} rounded-lg`}
    />
  );
}
