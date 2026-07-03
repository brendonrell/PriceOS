import { type NextRequest, NextResponse } from 'next/server';
import { badRequest, notFound, serverError } from '@/lib/errors';
import {
  getUserProfileByHandle,
  type UserProfileData,
} from '@/lib/profile/getUserProfileByHandle';

export const dynamic = 'force-dynamic';

const HANDLE_RE = /^[a-z0-9_-]+$/;

export type UserProfileResponse = UserProfileData;

export async function GET(_req: NextRequest, props: { params: Promise<{ handle: string }> }): Promise<NextResponse> {
  const params = await props.params;
  const handle = params.handle.toLowerCase();
  if (!HANDLE_RE.test(handle)) {
    return badRequest('Invalid handle');
  }
  try {
    const profile = await getUserProfileByHandle(handle);
    if (!profile) return notFound('User not found');
    return NextResponse.json(profile);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
