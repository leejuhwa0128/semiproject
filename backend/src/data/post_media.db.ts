import oracledb from "oracledb";
import { getOracleConnection } from "../config/oracle";

export const insertPostMedia = async (
  postId: number,
  mediaUrl: string,
  mediaType: string
) => {
  const conn = await getOracleConnection();

  try {
    await conn.execute(
      `
      INSERT INTO post_media
      (media_id, post_id, media_url, media_type)
      VALUES (post_media_seq.NEXTVAL, :postId, :mediaUrl, :mediaType)
      `,
      { postId, mediaUrl, mediaType }
    );

    await conn.commit();
  } finally {
    await conn.close();
  }
};
