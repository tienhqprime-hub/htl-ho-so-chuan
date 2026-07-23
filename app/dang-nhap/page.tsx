import { login } from './actions';

export default function LoginPage(){
 return <main className='shell'><section className='panel'><h1>Đăng nhập HTL</h1><form action={login}><label>Email</label><input name='email' type='email' required/><label>Mật khẩu</label><input name='password' type='password' required/><button type='submit'>Đăng nhập</button></form></section></main>
}