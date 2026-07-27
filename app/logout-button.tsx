import { logout } from './dang-nhap/actions';

export default function LogoutButton() {
  return (
    <form action={logout}>
      <button className="primary secondary" type="submit">
        Đăng xuất
      </button>
    </form>
  );
}
