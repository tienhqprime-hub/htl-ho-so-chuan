import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const protectedRoutes = ['/ho-so', '/kiem-tra', '/dashboard', '/quan-tri', '/admin'];
const protectedApiRoutes = ['/api/analyze'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Hệ thống xác thực chưa được cấu hình đầy đủ.' },
        { status: 503 },
      );
    }

    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const isProtectedApiRoute = protectedApiRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (!user && isProtectedApiRoute) {
    return NextResponse.json(
      { error: 'Phiên đăng nhập đã hết hạn. Anh/chị vui lòng đăng nhập lại.' },
      { status: 401 },
    );
  }

  if (!user && isProtectedRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/';
    loginUrl.searchParams.set('next', pathname);
    loginUrl.hash = 'dang-nhap';
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === '/dang-nhap') {
    const destination = request.nextUrl.searchParams.get('next') || '/ho-so';
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
