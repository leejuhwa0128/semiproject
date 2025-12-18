import oracledb from "oracledb";
import { getOracleConnection } from "../config/oracle";

export const createPost = async (
  userId: number,
  content: string,
  emotion: number
): Promise<number> => {
  let conn: oracledb.Connection | undefined;

  try {
    conn = await getOracleConnection();

    const result = await conn.execute(
      `
      INSERT INTO posts (post_id, user_id, content, emotion)
      VALUES (posts_seq.NEXTVAL, :userId, :content, :emotion)
      RETURNING post_id INTO :postId
      `,
      {
        userId,
        content,
        emotion,
        postId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    );

    await conn.commit();

    const outBinds = result.outBinds as {
      postId: number[];
    };

    return outBinds.postId[0];
  } catch (err) {
    console.error("❌ createPost error:", err);
    throw err;
  } finally {
    if (conn) await conn.close();
  }
};
